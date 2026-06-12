import { FileText, TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface ArtifactStat {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

interface ArtifactCardProps {
  title: string;
  subtitle: string;
  stats: ArtifactStat[];
  onPreview: () => void;
  onDetails: () => void;
}

export function ArtifactCard({ title, subtitle, stats, onPreview, onDetails }: ArtifactCardProps) {
  return (
    <div className="artifactCard">
      <div className="artifactCard-header">
        <div className="icon">
          <FileText size={14} />
        </div>
        <h3>{title}</h3>
      </div>
      <div className="artifactCard-subtitle">{subtitle}</div>
      <div className="artifactCard-stats">
        {stats.map((stat, i) => (
          <div className="artifactStat" key={i}>
            <span className="label">{stat.label}</span>
            <span className={`value ${stat.changeType ?? ""}`}>{stat.value}</span>
            {stat.change && (
              <span className={`change ${stat.changeType ?? ""}`}>
                {stat.changeType === "positive" && <TrendingUp size={10} />}
                {stat.changeType === "negative" && <TrendingDown size={10} />}
                {stat.changeType === "neutral" && <Minus size={10} />}
                {stat.change}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="artifactCard-actions">
        <button className="primary" onClick={onPreview}>预览报告</button>
        <button className="secondary" onClick={onDetails}>查看详情</button>
      </div>
    </div>
  );
}
