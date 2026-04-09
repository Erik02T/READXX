import { useEffect, useState } from "react";

type FloatingToolbarProps = {
  x: number;
  y: number;
  isLoading: boolean;
  loadingAction: "translate" | "explain" | null;
  translateResult: string | null;
  explainResult: string | null;
  onRead: () => void;
  onSave: () => void;
  onTranslate: () => void;
  onExplain: () => void;
  onClose: () => void;
};

export default function FloatingToolbar({
  x,
  y,
  isLoading,
  loadingAction,
  translateResult,
  explainResult,
  onRead,
  onSave,
  onTranslate,
  onExplain,
  onClose,
}: FloatingToolbarProps): JSX.Element {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 10);
    return () => window.clearTimeout(timer);
  }, []);

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    transform: "translateX(-50%)",
    zIndex: 2147483647,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const toolbarStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    background: "#1a1e28",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "8px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
    height: "38px",
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(-4px)",
    transition: "opacity 150ms ease-out, transform 150ms ease-out",
  };

  const buttonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 10px",
    background: "transparent",
    border: "none",
    color: "#e8eaf0",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 150ms ease",
    height: "100%",
    whiteSpace: "nowrap",
  };

  const buttonDisabledStyle: React.CSSProperties = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: "not-allowed",
  };

  const separatorStyle: React.CSSProperties = {
    width: "1px",
    height: "20px",
    background: "rgba(255, 255, 255, 0.08)",
  };

  const arrowStyle: React.CSSProperties = {
    position: "absolute",
    bottom: "-6px",
    left: "50%",
    transform: "translateX(-50%)",
    width: 0,
    height: 0,
    borderLeft: "6px solid transparent",
    borderRight: "6px solid transparent",
    borderTop: "6px solid #1a1e28",
  };

  const arrowBorderStyle: React.CSSProperties = {
    position: "absolute",
    bottom: "-8px",
    left: "50%",
    transform: "translateX(-50%)",
    width: 0,
    height: 0,
    borderLeft: "7px solid transparent",
    borderRight: "7px solid transparent",
    borderTop: "7px solid rgba(255, 255, 255, 0.12)",
  };

  const resultCardStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 12px)",
    left: "50%",
    transform: "translateX(-50%)",
    width: "300px",
    background: "#1a1e28",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "8px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
    padding: "12px",
    color: "#e8eaf0",
    fontSize: "13px",
    lineHeight: 1.5,
  };

  const resultHeaderStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
    paddingBottom: "8px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  };

  const resultTitleStyle: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "rgba(255, 255, 255, 0.6)",
  };

  const closeButtonStyle: React.CSSProperties = {
    background: "transparent",
    border: "none",
    color: "rgba(255, 255, 255, 0.5)",
    cursor: "pointer",
    padding: "2px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const spinnerStyle: React.CSSProperties = {
    width: "14px",
    height: "14px",
    border: "2px solid rgba(255, 255, 255, 0.2)",
    borderTopColor: "#e8eaf0",
    borderRadius: "50%",
    animation: "readxx-spin 600ms linear infinite",
  };

  const keyframesStyle = `
    @keyframes readxx-spin {
      to { transform: rotate(360deg); }
    }
  `;

  const PlayIcon = (): JSX.Element => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );

  const SaveIcon = (): JSX.Element => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );

  const TranslateIcon = (): JSX.Element => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );

  const ExplainIcon = (): JSX.Element => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );

  const CloseIcon = (): JSX.Element => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const spinner = <div style={spinnerStyle} />;

  const handleMouseEnter = (event: React.MouseEvent<HTMLButtonElement>): void => {
    if (!isLoading) {
      event.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
    }
  };

  const handleMouseLeave = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.currentTarget.style.background = "transparent";
  };

  return (
    <div style={containerStyle}>
      <style>{keyframesStyle}</style>
      <div style={{ position: "relative" }}>
        <div style={toolbarStyle}>
          <button
            type="button"
            style={isLoading ? buttonDisabledStyle : buttonStyle}
            onClick={onRead}
            disabled={isLoading}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <PlayIcon />
            <span>Read</span>
          </button>
          <div style={separatorStyle} />
          <button
            type="button"
            style={isLoading ? buttonDisabledStyle : buttonStyle}
            onClick={onSave}
            disabled={isLoading}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <SaveIcon />
            <span>Save</span>
          </button>
          <div style={separatorStyle} />
          <button
            type="button"
            style={isLoading ? buttonDisabledStyle : buttonStyle}
            onClick={onTranslate}
            disabled={isLoading}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {loadingAction === "translate" ? spinner : <TranslateIcon />}
            <span>Translate</span>
          </button>
          <div style={separatorStyle} />
          <button
            type="button"
            style={isLoading ? buttonDisabledStyle : buttonStyle}
            onClick={onExplain}
            disabled={isLoading}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {loadingAction === "explain" ? spinner : <ExplainIcon />}
            <span>Explain</span>
          </button>
        </div>
        <div style={arrowBorderStyle} />
        <div style={arrowStyle} />

        {translateResult && (
          <div style={resultCardStyle}>
            <div style={resultHeaderStyle}>
              <span style={resultTitleStyle}>Translation</span>
              <button type="button" style={closeButtonStyle} onClick={onClose}>
                <CloseIcon />
              </button>
            </div>
            <div>{translateResult}</div>
          </div>
        )}

        {explainResult && (
          <div style={resultCardStyle}>
            <div style={resultHeaderStyle}>
              <span style={resultTitleStyle}>Explanation</span>
              <button type="button" style={closeButtonStyle} onClick={onClose}>
                <CloseIcon />
              </button>
            </div>
            <div>{explainResult}</div>
          </div>
        )}
      </div>
    </div>
  );
}
