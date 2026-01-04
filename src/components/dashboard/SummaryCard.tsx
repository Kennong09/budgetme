import React, { FC, memo, useMemo } from "react";
import { formatCurrency, formatPercentage } from "../../utils/helpers";

interface SummaryCardProps {
  title: string;
  amount: number;
  icon: string;
  color: string;
  change?: number;
  timeFrame?: string;
}

const SummaryCard: FC<SummaryCardProps> = memo(({
  title,
  amount,
  icon,
  color = "primary",
  change,
  timeFrame = "from last month",
}) => {
  // Memoize color calculation to prevent recalculation on every render
  const colorValue = useMemo(() => {
    switch (color) {
      case "primary":
        return "#6366f1"; // Updated to violet
      case "success":
        return "#1cc88a";
      case "info":
        return "#36b9cc";
      case "warning":
        return "#f6c23e";
      case "danger":
        return "#e74a3b";
      default:
        return "#6366f1"; // Default to violet
    }
  }, [color]);

  // Memoize icon class
  const iconClass = useMemo(() => `fas ${icon}`, [icon]);

  // Memoize formatted values
  const formattedAmount = useMemo(() => formatCurrency(amount), [amount]);
  const formattedChange = useMemo(() => 
    change !== undefined ? formatPercentage(change) : null, 
    [change]
  );

  return (
    <div className={`card border-left-${color} shadow h-100 py-2 animate__animated animate__fadeIn`}>
      <div className="card-body">
        <div className="row no-gutters align-items-center">
          <div className="col mr-2">
            <div
              className={`text-xs font-weight-bold text-${color} text-uppercase mb-1`}
            >
              {title}
            </div>
            <div className="h5 mb-0 font-weight-bold text-gray-800">
              {formattedAmount}
            </div>
            {change !== undefined && (
              <div
                className={`mt-2 text-xs ${
                  change >= 0 ? "text-success" : "text-danger"
                }`}
              >
                <span>
                  {change >= 0 ? "+" : ""}
                  {formattedChange}{" "}
                  <i
                    className={`fas fa-${
                      change >= 0 ? "arrow-up" : "arrow-down"
                    }`}
                  ></i>
                </span>
                <span className="text-gray-500 ml-1">{timeFrame}</span>
              </div>
            )}
          </div>
          <div className="col-auto">
            <div
              className="rounded-circle p-2"
              style={{
                backgroundColor: `${colorValue}15`,
              }}
            >
              <i
                className={iconClass}
                style={{ color: colorValue, fontSize: "1.75rem" }}
              ></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

SummaryCard.displayName = 'SummaryCard';

export default SummaryCard;
