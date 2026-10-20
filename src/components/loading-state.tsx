type LoadingStateProps = {
  message?: string;
  fullScreen?: boolean;
};

export function LoadingState({
  message = 'Cargando…',
  fullScreen = false,
}: LoadingStateProps) {
  return (
    <div
      className={`app-loading${fullScreen ? ' app-loading--fullscreen' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="loading-artwork" aria-hidden="true">
        <div className="loading-record" />
        <div className="loading-label">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
      {fullScreen && (
        <div className="loading-brand" aria-hidden="true">
          ritmo<span>●</span>
        </div>
      )}
      <p className="loading-message">{message}</p>
    </div>
  );
}
