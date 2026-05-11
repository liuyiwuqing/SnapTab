import { useEffect, useState } from "react";
import { getPreferences, getUserFrameTemplates, setPreferences, setUserFrameTemplates } from "@shared/storage";
import type { EditorPreferences } from "@shared/types";

export function OptionsApp(): JSX.Element {
  const [preferences, setLocalPreferences] = useState<EditorPreferences | null>(null);
  const [status, setStatus] = useState("Loading...");
  const [templateCount, setTemplateCount] = useState(0);

  useEffect(() => {
    void (async () => {
      const [pref, templates] = await Promise.all([getPreferences(), getUserFrameTemplates()]);
      setLocalPreferences(pref);
      setTemplateCount(templates.length);
      setStatus("Preferences loaded.");
    })();
  }, []);

  const save = async () => {
    if (!preferences) {
      return;
    }
    await setPreferences(preferences);
    setStatus("Saved.");
  };

  const resetUserTemplates = async () => {
    await setUserFrameTemplates([]);
    setTemplateCount(0);
    setStatus("User templates cleared.");
  };

  if (!preferences) {
    return (
      <main className="options-root">
        <h1>SnapTab 偏好设置</h1>
        <p className="status">{status}</p>
      </main>
    );
  }

  return (
    <main className="options-root">
      <h1>SnapTab 偏好设置</h1>
      <section className="panel">
        <h2>导出设置</h2>
        <label>
          默认格式
          <select
            value={preferences.exportFormat}
            onChange={(event) =>
              setLocalPreferences({ ...preferences, exportFormat: event.target.value as "png" | "jpg" })
            }
          >
            <option value="png">PNG（清晰）</option>
            <option value="jpg">JPG（体积小）</option>
          </select>
        </label>
        <label>
          JPG 质量（{preferences.jpgQuality.toFixed(2)}）
          <input
            type="range"
            min={0.5}
            max={1}
            step={0.01}
            value={preferences.jpgQuality}
            onChange={(event) =>
              setLocalPreferences({
                ...preferences,
                jpgQuality: Number(event.target.value)
              })
            }
          />
        </label>
        <label>
          文件命名策略
          <select
            value={preferences.filenamePattern}
            onChange={(event) =>
              setLocalPreferences({
                ...preferences,
                filenamePattern: event.target.value as EditorPreferences["filenamePattern"]
              })
            }
          >
            <option value="domain-timestamp">域名-时间戳</option>
            <option value="title-timestamp">标题-时间戳</option>
          </select>
        </label>
      </section>

      <section className="panel">
        <h2>分享设置</h2>
        <label>
          默认分享动作
          <select
            value={preferences.defaultShareAction}
            onChange={(event) =>
              setLocalPreferences({
                ...preferences,
                defaultShareAction: event.target.value as EditorPreferences["defaultShareAction"]
              })
            }
          >
            <option value="copy">复制图片</option>
            <option value="download">下载文件</option>
            <option value="webshare">浏览器分享</option>
          </select>
        </label>
      </section>

      <section className="panel">
        <h2>套壳模板</h2>
        <p>用户上传模板：{templateCount} 套</p>
        <button type="button" className="danger" onClick={() => void resetUserTemplates()}>
          清空用户上传模板
        </button>
      </section>

      <section className="actions">
        <button type="button" onClick={() => void save()}>
          保存设置
        </button>
        <p className="status">{status}</p>
      </section>
    </main>
  );
}
