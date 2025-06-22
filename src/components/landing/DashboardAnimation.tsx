import React, { useEffect, FC } from "react";
import "../../assets/css/dashboardAnimation.css";

const DashboardAnimation: FC = () => {
  useEffect(() => {
    // Animation timing function
    const animateElements = (): void => {
      const animatedElements = document.querySelectorAll(".animate-item-dashanimate");
      animatedElements.forEach((element) => {
        if (element instanceof HTMLElement) {
          element.style.animation = "none";
          void element.offsetHeight;
          element.style.animation = "";
        }
      });
    };

    // Run animation initially and every 6 seconds
    animateElements();
    const interval = setInterval(animateElements, 6000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-preview-dashanimate">
      <div className="preview-header-dashanimate">
        <div className="preview-title-dashanimate">
          <div className="logo-icon-dashanimate"><i className="fas fa-wallet"></i></div>
          Dashboard
        </div>
        <div style={{ fontSize: "11px" }}>May 2025</div>
      </div>

      <div className="preview-content-dashanimate">
        {/* Summary Cards */}
        <div className="summary-cards-dashanimate">
          <div className="summary-card-dashanimate income-dashanimate animate-item-dashanimate" style={{ animationDelay: "0.1s" }}>
            <div className="card-title-dashanimate">Income</div>
            <div className="card-value-dashanimate">$4,250</div>
            <div className="card-icon-dashanimate"><i className="fas fa-calendar"></i></div>
          </div>
          <div className="summary-card-dashanimate expenses-dashanimate animate-item-dashanimate" style={{ animationDelay: "0.2s" }}>
            <div className="card-title-dashanimate">Expenses</div>
            <div className="card-value-dashanimate">$2,870</div>
            <div className="card-icon-dashanimate"><i className="fas fa-solid fa-peso-sign"></i></div>
          </div>
          <div className="summary-card-dashanimate balance-dashanimate animate-item-dashanimate" style={{ animationDelay: "0.3s" }}>
            <div className="card-title-dashanimate">Balance</div>
            <div className="card-value-dashanimate">$1,380</div>
            <div className="card-icon-dashanimate"><i className="fas fa-clipboard-list"></i></div>
          </div>
          <div className="summary-card-dashanimate savings-dashanimate animate-item-dashanimate" style={{ animationDelay: "0.4s" }}>
            <div className="card-title-dashanimate">Savings</div>
            <div className="card-value-dashanimate">32.5%</div>
            <div className="card-icon-dashanimate"><i className="fas fa-percentage"></i></div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="charts-row-dashanimate">
          {/* Monthly Overview Chart */}
          <div className="chart-card-dashanimate">
            <div className="chart-header-dashanimate">
              <div className="chart-title-dashanimate">Monthly Overview</div>
            </div>
            <div className="bar-chart-dashanimate">
              <div className="chart-bar-container-dashanimate">
                <div className="chart-bar-wrapper-dashanimate">
                  <div className="chart-bar-dashanimate animate-item-dashanimate" style={{ "--bar-height": "50%" } as React.CSSProperties}></div>
                </div>
                <div className="chart-label-dashanimate">Jan</div>
              </div>
              <div className="chart-bar-container-dashanimate">
                <div className="chart-bar-wrapper-dashanimate">
                  <div className="chart-bar-dashanimate animate-item-dashanimate" style={{ "--bar-height": "70%" } as React.CSSProperties}></div>
                </div>
                <div className="chart-label-dashanimate">Feb</div>
              </div>
              <div className="chart-bar-container-dashanimate">
                <div className="chart-bar-wrapper-dashanimate">
                  <div className="chart-bar-dashanimate animate-item-dashanimate" style={{ "--bar-height": "40%" } as React.CSSProperties}></div>
                </div>
                <div className="chart-label-dashanimate">Mar</div>
              </div>
              <div className="chart-bar-container-dashanimate">
                <div className="chart-bar-wrapper-dashanimate">
                  <div className="chart-bar-dashanimate animate-item-dashanimate" style={{ "--bar-height": "60%" } as React.CSSProperties}></div>
                </div>
                <div className="chart-label-dashanimate">Apr</div>
              </div>
              <div className="chart-bar-container-dashanimate">
                <div className="chart-bar-wrapper-dashanimate">
                  <div className="chart-bar-dashanimate animate-item-dashanimate" style={{ "--bar-height": "85%" } as React.CSSProperties}></div>
                </div>
                <div className="chart-label-dashanimate">May</div>
              </div>
            </div>
          </div>

          {/* Spending by Category Chart */}
          <div className="chart-card-dashanimate">
            <div className="chart-header-dashanimate">
              <div className="chart-title-dashanimate">Spending by Category</div>
            </div>
            <div className="donut-chart-dashanimate">
              <div className="donut-dashanimate">
                <div className="donut-hole-dashanimate">35%</div>
              </div>
            </div>
            <div className="legend-dashanimate">
              <div className="legend-item-dashanimate">
                <div className="legend-color-dashanimate" style={{ backgroundColor: "var(--primary)" }}></div>
                Housing
              </div>
              <div className="legend-item-dashanimate">
                <div className="legend-color-dashanimate" style={{ backgroundColor: "#1cc88a" }}></div>
                Food
              </div>
              <div className="legend-item-dashanimate">
                <div className="legend-color-dashanimate" style={{ backgroundColor: "#e74a3b" }}></div>
                Transport
              </div>
              <div className="legend-item-dashanimate">
                <div className="legend-color-dashanimate" style={{ backgroundColor: "#f6c23e" }}></div>
                Entertainment
              </div>
            </div>
          </div>
        </div>

        {/* Budget Progress */}
        <div className="bottom-row-dashanimate">
          <div className="chart-card-dashanimate">
            <div className="chart-header-dashanimate">
              <div className="chart-title-dashanimate">Budget Progress</div>
            </div>
            
            <div className="progress-container-dashanimate">
              <div className="progress-header-dashanimate">
                <div className="progress-title-dashanimate">Housing</div>
                <div className="progress-value-dashanimate">75%</div>
              </div>
              <div className="progress-bar-bg-dashanimate">
                <div 
                  className="progress-bar-fill-dashanimate progress-bar-housing-dashanimate animate-item-dashanimate" 
                  style={{ "--final-width": "75%" } as React.CSSProperties}
                ></div>
              </div>
            </div>
            
            <div className="progress-container-dashanimate">
              <div className="progress-header-dashanimate">
                <div className="progress-title-dashanimate">Food & Dining</div>
                <div className="progress-value-dashanimate">62%</div>
              </div>
              <div className="progress-bar-bg-dashanimate">
                <div 
                  className="progress-bar-fill-dashanimate progress-bar-food-dashanimate animate-item-dashanimate" 
                  style={{ "--final-width": "62%" } as React.CSSProperties}
                ></div>
              </div>
            </div>
            
            <div className="progress-container-dashanimate">
              <div className="progress-header-dashanimate">
                <div className="progress-title-dashanimate">Transportation</div>
                <div className="progress-value-dashanimate">45%</div>
              </div>
              <div className="progress-bar-bg-dashanimate">
                <div 
                  className="progress-bar-fill-dashanimate progress-bar-transport-dashanimate animate-item-dashanimate" 
                  style={{ "--final-width": "45%" } as React.CSSProperties}
                ></div>
              </div>
            </div>
            
            <div className="progress-container-dashanimate">
              <div className="progress-header-dashanimate">
                <div className="progress-title-dashanimate">Entertainment</div>
                <div className="progress-value-dashanimate">85%</div>
              </div>
              <div className="progress-bar-bg-dashanimate">
                <div 
                  className="progress-bar-fill-dashanimate progress-bar-entertainment-dashanimate animate-item-dashanimate" 
                  style={{ "--final-width": "85%" } as React.CSSProperties}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardAnimation;
