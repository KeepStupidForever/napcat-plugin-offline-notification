/**
 * 插件配置模块
 * 定义默认配置值和 WebUI 配置 Schema
 */

import type { NapCatPluginContext, PluginConfigSchema } from 'napcat-types/napcat-onebot/network/plugin/types';
import type { PluginConfig } from './types';

/** 默认配置 */
export const DEFAULT_CONFIG: PluginConfig = {
    enabled: true,
    debug: false,
    serverChanSendKey: '',
    checkIntervalSeconds: 60,
    repeatNotificationIntervalSeconds: 1800,
    commandPrefix: '#cmd',
    cooldownSeconds: 60,
    groupConfigs: {},
};

/**
 * 构建 WebUI 配置 Schema
 *
 * 使用 ctx.NapCatConfig 提供的构建器方法生成配置界面：
 *   - boolean(key, label, defaultValue?, description?, reactive?)  → 开关
 *   - text(key, label, defaultValue?, description?, reactive?)     → 文本输入
 *   - number(key, label, defaultValue?, description?, reactive?)   → 数字输入
 *   - select(key, label, options, defaultValue?, description?)     → 下拉单选
 *   - multiSelect(key, label, options, defaultValue?, description?) → 下拉多选
 *   - html(content)     → 自定义 HTML 展示（不保存值）
 *   - plainText(content) → 纯文本说明
 *   - combine(...items)  → 组合多个配置项为 Schema
 */
export function buildConfigSchema(ctx: NapCatPluginContext): PluginConfigSchema {
    return ctx.NapCatConfig.combine(
        // 插件信息头部
        ctx.NapCatConfig.html(`
            <div style="padding: 16px; background: #07C160; border-radius: 12px; margin-bottom: 20px; color: white;">
                <h3 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 600;">掉线通知插件</h3>
                <p style="margin: 0; font-size: 13px; opacity: 0.85;">NapCat 掉线检测，通过 Server酱 发送微信通知</p>
            </div>
            <div style="padding: 12px; background: #f5f5f5; border-radius: 8px; margin-bottom: 20px; font-size: 13px; line-height: 1.6;">
                <p style="margin: 0 0 8px 0;"><strong>使用说明：</strong></p>
                <p style="margin: 0 0 4px 0;">1. 前往 <a href="https://sct.ftqq.com/" target="_blank" style="color: #1890ff;">https://sct.ftqq.com/</a> 注册获取 SendKey</p>
                <p style="margin: 0 0 4px 0;">2. 将 SendKey 填入下方配置</p>
                <p style="margin: 0;">3. 配置完成后插件会定时检查 NapCat 在线状态，掉线时自动发送微信通知</p>
            </div>
        `),
        // 全局开关
        ctx.NapCatConfig.boolean('enabled', '启用插件', true, '是否启用此插件的功能', true),
        // 调试模式
        ctx.NapCatConfig.boolean('debug', '调试模式', false, '启用后将输出详细的调试日志', true),
        // Server酱 SendKey
        ctx.NapCatConfig.text('serverChanSendKey', 'Server酱 SendKey', '', '从 https://sct.ftqq.com/ 获取你的 SendKey', true),
        // 检查间隔
        ctx.NapCatConfig.number('checkIntervalSeconds', '检查间隔（秒）', 10, '每隔多少秒检查一次在线状态，建议不小于 30 秒', true),
        // 重复通知间隔
        ctx.NapCatConfig.number('repeatNotificationIntervalSeconds', '重复通知间隔（秒）', 60, '同一掉线状态多久重复通知一次，0 表示只通知一次', true)
    );
}
