export default function AdminAnalyticsLoading() {
  return <div className="analytics-page" aria-busy="true" aria-label="Cargando analíticas">
    <div className="analytics-toolbar"><div className="analytics-skeleton analytics-skeleton-select" /><div className="analytics-skeleton analytics-skeleton-select" /></div>
    <div className="analytics-kpi-grid">{Array.from({ length: 6 }, (_, index) => <div className={`analytics-skeleton analytics-skeleton-kpi ${index === 0 ? "wide-mobile" : ""}`} key={index} />)}</div>
    <div className="analytics-card analytics-skeleton analytics-skeleton-chart" />
    <div className="analytics-two-columns"><div className="analytics-card analytics-skeleton analytics-skeleton-chart" /><div className="analytics-card analytics-skeleton analytics-skeleton-chart" /></div>
  </div>;
}
