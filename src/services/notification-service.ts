/**
 * 通知服务模块
 * 处理掉线检测和Server酱微信通知
 */

import { pluginState } from '../core/state';

/**
 * Server酱响应格式
 */
interface ServerChanResponse {
    code: number;
    message: string;
    data?: unknown;
}

/**
 * 发送Server酱通知
 * @param title 通知标题
 * @param content 通知内容
 */
export async function sendServerChanNotification(title: string, content: string): Promise<boolean> {
    const sendKey = pluginState.config.serverChanSendKey?.trim();
    if (!sendKey) {
        pluginState.logger.error('Server酱 SendKey 未配置，无法发送通知');
        return false;
    }

    try {
        const url = `https://sctapi.ftqq.com/${sendKey}.send`;
        const body = new URLSearchParams({
            title: title,
            desp: content,
        });

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });

        const data = (await response.json()) as ServerChanResponse;

        if (data.code === 0) {
            pluginState.logger.info(`Server酱通知发送成功: ${title}`);
            return true;
        } else {
            pluginState.logger.error(`Server酱通知发送失败: ${data.message}`);
            return false;
        }
    } catch (error) {
        pluginState.logger.error('Server酱通知发送异常:', error);
        return false;
    }
}

/**
 * 掉线检测服务
 */
export class OfflineDetectionService {
    /** 检测定时器 */
    private timer: ReturnType<typeof setInterval> | null = null;
    /** 当前是否处于离线状态 */
    private isOffline: boolean = false;
    /** 上次通知时间戳 */
    private lastNotificationTime: number = 0;

    /**
     * 开始检测
     */
    start(): void {
        if (this.timer) {
            pluginState.logger.info('掉线检测已经在运行中');
            return;
        }

        const interval = Math.max(10, pluginState.config.checkIntervalSeconds) * 1000;
        pluginState.logger.info(`开始掉线检测，检查间隔: ${pluginState.config.checkIntervalSeconds} 秒`);

        const that = this;
        
        this.timer = setInterval(function() {
            that.checkStatus();
        }, interval);

        // 添加到全局定时器管理
        pluginState.timers.set('offline-check', this.timer);
        
        // 启动后立即检查一次
        this.checkStatus();
        
        pluginState.logger.info('掉线检测启动完成');
    }

    /**
     * 停止检测
     */
    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            pluginState.timers.delete('offline-check');
            this.timer = null;
            pluginState.logger.debug('掉线检测已停止');
        }
    }

    /**
     * 检查当前在线状态
     */
    private async checkStatus(): Promise<void> {
        if (!pluginState.config.enabled) {
            return;
        }

        let isOnline = false;

        try {
            // 方法1：调用 get_status 获取实际在线状态（NapCat专属API更准确）
            const statusResult = await pluginState.ctx.actions.call(
                'get_status',
                {},
                pluginState.ctx.adapterName,
                pluginState.ctx.pluginManager.config
            ) as { online?: boolean; good?: boolean };

            // 如果 get_status 返回 online = false，直接判定离线
            if (statusResult && typeof statusResult === 'object' && 'online' in statusResult) {
                isOnline = !!statusResult.online;
            } else {
                // fallback: 使用 get_login_info 判断
                const result = await pluginState.ctx.actions.call(
                    'get_login_info',
                    {},
                    pluginState.ctx.adapterName,
                    pluginState.ctx.pluginManager.config
                );

                if (result && typeof result === 'object') {
                    if ('status' in result && typeof result.status === 'string') {
                        isOnline = result.status === 'online';
                    } else if ('user_id' in result) {
                        // 即使账号离线也会返回user_id，所以这里直接改用调用get_client_status检查
                        try {
                            const clientStatus = await pluginState.ctx.actions.call(
                                'get_client_status' as any,
                                {},
                                pluginState.ctx.adapterName,
                                pluginState.ctx.pluginManager.config
                            ) as { online?: boolean };
                            isOnline = !!clientStatus?.online;
                        } catch (e) {
                            // get_client_status 调用失败，默认按在线处理
                            isOnline = true;
                        }
                    }
                }
            }

            if (isOnline) {
                this.isOffline = false;
                return;
            }

            pluginState.logger.warn(`检测到NapCat离线，准备发送通知...`);
            this.handleOffline('在线状态检测返回 offline');
        } catch (error) {
            // API调用失败，判定为离线
            pluginState.logger.warn('状态检查失败，判定为离线:', error);
            this.handleOffline(`API调用异常: ${error}`);
        }
    }

    /**
     * 处理离线情况
     */
    private handleOffline(reason: string): void {
        const now = Date.now();
        const config = pluginState.config;

        // 如果之前是在线状态，或者需要重复通知
        const shouldNotify =
            !this.isOffline ||
            (config.repeatNotificationIntervalSeconds > 0 &&
                now - this.lastNotificationTime >= config.repeatNotificationIntervalSeconds * 1000);

        this.isOffline = true;

        if (shouldNotify) {
            pluginState.logger.warn('检测到NapCat离线，准备发送通知...');
            this.sendOfflineNotification(reason);
            this.lastNotificationTime = now;
        }
    }

    /**
     * 发送掉线通知
     */
    private async sendOfflineNotification(reason: string): Promise<void> {
        const selfId = pluginState.selfId || '未知';
        const title = '⚠️ NapCat 掉线通知';
        const content = `
**机器人QQ:** ${selfId}
**掉线时间:** ${new Date().toLocaleString('zh-CN')}
**失败原因:** ${reason}

请及时检查NapCat运行状态！
`.trim();

        await sendServerChanNotification(title, content);
    }
}

/** 导出掉线检测服务单例 */
export const offlineDetectionService = new OfflineDetectionService();