/**
 * Main Application View
 * Integrates MVC components into the main React app
 */

const { useState, useEffect, useRef, useReducer } = React;
const { TabBar, WelcomeScreen, ControlPanel, ParameterControls, ChartCanvas } = window;

function EKFVisualization() {
  // Controller ref
  const controllerRef = useRef(null);

  // Chart refs for registration
  const positionChartRef = useRef(null);
  const accelChartRef = useRef(null);
  const velocityChartRef = useRef(null);
  const innovationChartRef = useRef(null);
  const kalmanGainChartRef = useRef(null);
  const uncertaintyChartRef = useRef(null);
  const errorChartRef = useRef(null);

  // Force re-render when controller state changes
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  // UI state (managed by React, not controller)
  const [tabs, setTabs] = useState([{ id: 'welcome', name: 'Welcome', type: 'welcome' }]);
  const [activeTabId, setActiveTabId] = useState('welcome');
  const [isRunning, setIsRunning] = useState(false);
  const [parameters, setParameters] = useState({});
  const [timelineInfo, setTimelineInfo] = useState({ position: 100, currentTime: 0, endTime: 0, totalPoints: 0 });

  // Inject tooltip delay CSS and slider styles
  useEffect(() => {
    if (!document.querySelector('style[data-tooltip-delay]')) {
      const tooltipDelayStyle = document.createElement('style');
      tooltipDelayStyle.setAttribute('data-tooltip-delay', 'true');
      tooltipDelayStyle.textContent = `
        .tooltip-delay-group .tooltip-content {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: none;
        }
        .tooltip-delay-group:hover .tooltip-content {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          transition: opacity 0.2s 1s, visibility 0s 1s;
        }

        /* Timeline slider styles */
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 4px;
          height: 20px;
          background: #6b7280;  /* gray-500 default */
          border-radius: 2px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .slider-thumb::-moz-range-thumb {
          width: 4px;
          height: 20px;
          background: #6b7280;  /* gray-500 default */
          border-radius: 2px;
          cursor: pointer;
          border: none;
          transition: background-color 0.2s;
        }

        .slider-thumb:hover::-webkit-slider-thumb {
          background: #9ca3af;  /* gray-400 hover */
        }

        .slider-thumb:hover::-moz-range-thumb {
          background: #9ca3af;  /* gray-400 hover */
        }

        .slider-thumb:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .slider-thumb:disabled::-webkit-slider-thumb {
          cursor: not-allowed;
        }

        .slider-thumb:disabled::-moz-range-thumb {
          cursor: not-allowed;
        }
      `;
      document.head.appendChild(tooltipDelayStyle);
    }
  }, []);

  // Initialize controller and subscribe to events
  useEffect(() => {
    // Create controller
    controllerRef.current = new window.SimulationController();

    // Sync initial state
    setTabs(controllerRef.current.getAllTabs());
    setActiveTabId(controllerRef.current.getActiveTab() || 'welcome');
    setParameters(controllerRef.current.getAllParameters());
    setIsRunning(controllerRef.current.getIsRunning());

    // Subscribe to controller events
    const unsubscribers = [];

    unsubscribers.push(controllerRef.current.subscribe('tabs-updated', (newTabs) => {
      setTabs(newTabs);
      forceUpdate();
    }));

    unsubscribers.push(controllerRef.current.subscribe('tab-changed', (newTabId) => {
      setActiveTabId(newTabId);
      forceUpdate();
    }));

    unsubscribers.push(controllerRef.current.subscribe('parameters-updated', (newParams) => {
      setParameters(newParams);
      forceUpdate();
    }));

    unsubscribers.push(controllerRef.current.subscribe('running-changed', (running) => {
      setIsRunning(running);
      forceUpdate();
    }));

    unsubscribers.push(controllerRef.current.subscribe('simulation-updated', () => {
      // Charts are updated by controller, just force re-render if needed
    }));

    unsubscribers.push(controllerRef.current.subscribe('simulation-reset', () => {
      forceUpdate();
    }));

    unsubscribers.push(controllerRef.current.subscribe('timeline-position-changed', () => {
      setTimelineInfo(controllerRef.current.getTimelineInfo());
    }));

    unsubscribers.push(controllerRef.current.subscribe('simulation-updated', () => {
      // Update timeline info on every frame to show current time in live mode
      setTimelineInfo(controllerRef.current.getTimelineInfo());
    }));

    // Cleanup on unmount
    return () => {
      unsubscribers.forEach(unsub => unsub());
      if (controllerRef.current) {
        controllerRef.current.destroy();
      }
    };
  }, []);

  // Pan/zoom configuration for Chart.js plugin
  const createPanZoomConfig = () => ({
    pan: {
      enabled: false,  // Disabled - using timeline slider instead
    },
    zoom: {
      wheel: {
        enabled: true,
        speed: 0.1,  // Mouse wheel zoom speed
        mode: 'x'
      },
      pinch: {
        enabled: true,
        mode: 'x'  // Pinch in = zoom in (more detail), pinch out = zoom out (more data)
      },
      mode: 'x'
    },
    limits: {
      x: {
        min: 'original',  // Can't pan before start of data
        max: 'original',  // Can't pan beyond end of data
        minRange: 0.01   // Minimum zoom: 1% of total data (prevents zooming in too far)
      },
      y: {
        min: 'original',
        max: 'original'
      }
    }
  });

  // Register charts after refs are available and simulation tab is active
  useEffect(() => {
    if (!controllerRef.current) return;
    if (activeTabId === 'welcome') return; // Don't register charts on welcome tab

    // Position chart
    if (positionChartRef.current) {
      controllerRef.current.registerChart('position', positionChartRef.current, {
        data: {
          labels: [],
          datasets: [
            { label: 'True Position', data: [], borderColor: 'white', backgroundColor: 'white', borderWidth: 2, pointRadius: 0, tension: 0.1, order: 4 },
            { label: 'External Probe', data: [], borderColor: 'rgb(234, 179, 8)', backgroundColor: 'rgb(234, 179, 8)', borderWidth: 2, pointRadius: 0, tension: 0.1, order: 3 },
            { label: 'Process Model', data: [], borderColor: 'cyan', backgroundColor: 'cyan', borderWidth: 2, pointRadius: 0, tension: 0.1, order: 2 },
            { label: 'EKF Estimate', data: [], borderColor: 'red', backgroundColor: 'red', borderWidth: 3, pointRadius: 0, tension: 0.1, order: 1 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false, backgroundColor: '#1f2937',
          scales: {
            x: { title: { display: true, text: 'Time (s)', color: '#f3f4f6' }, ticks: { maxTicksLimit: 10, color: '#d1d5db', callback: (v) => Number(v).toFixed(2) }, grid: { color: '#374151' } },
            y: { title: { display: true, text: 'Position', color: '#f3f4f6' }, ticks: { color: '#d1d5db' }, grid: { color: '#374151' }, min: -2, max: 2 }
          },
          plugins: { zoom: createPanZoomConfig(), legend: { display: true, position: 'top', labels: { color: '#f3f4f6' } }, title: { display: true, text: 'Wave Position Tracking', color: '#f3f4f6', font: { size: 14, weight: 'bold' } } }
        }
      });
    }

    // Acceleration chart
    if (accelChartRef.current) {
      controllerRef.current.registerChart('acceleration', accelChartRef.current, {
        data: {
          labels: [],
          datasets: [
            { label: 'True Acceleration', data: [], borderColor: 'white', backgroundColor: 'white', borderWidth: 2, pointRadius: 0, tension: 0.1, order: 2 },
            { label: 'Inertial Measurement', data: [], borderColor: 'cyan', backgroundColor: 'cyan', borderWidth: 2, pointRadius: 0, tension: 0.1, order: 1 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false, backgroundColor: '#1f2937',
          scales: {
            x: { title: { display: true, text: 'Time (s)', color: '#f3f4f6' }, ticks: { maxTicksLimit: 10, color: '#d1d5db', callback: (v) => Number(v).toFixed(2) }, grid: { color: '#374151' } },
            y: { title: { display: true, text: 'Acceleration', color: '#f3f4f6' }, ticks: { color: '#d1d5db' }, grid: { color: '#374151' }, min: -5, max: 5 }
          },
          plugins: { zoom: createPanZoomConfig(), legend: { display: true, position: 'top', labels: { color: '#f3f4f6' } }, title: { display: true, text: 'Wave Acceleration', color: '#f3f4f6', font: { size: 14, weight: 'bold' } } }
        }
      });
    }

    // Velocity chart
    if (velocityChartRef.current) {
      controllerRef.current.registerChart('velocity', velocityChartRef.current, {
        data: {
          labels: [],
          datasets: [
            { label: 'True Velocity', data: [], borderColor: 'white', backgroundColor: 'white', borderWidth: 2, pointRadius: 0, tension: 0.1, order: 2 },
            { label: 'EKF Velocity Estimate', data: [], borderColor: 'rgb(220, 38, 38)', backgroundColor: 'rgb(220, 38, 38)', borderWidth: 2, pointRadius: 0, tension: 0.1, order: 1 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false, backgroundColor: '#1f2937',
          scales: {
            x: { title: { display: true, text: 'Time (s)', color: '#f3f4f6' }, ticks: { maxTicksLimit: 10, color: '#d1d5db', callback: (v) => Number(v).toFixed(2) }, grid: { color: '#374151' } },
            y: { title: { display: true, text: 'Velocity', color: '#f3f4f6' }, ticks: { color: '#d1d5db' }, grid: { color: '#374151' }, min: -3, max: 3 }
          },
          plugins: { zoom: createPanZoomConfig(), legend: { display: true, position: 'top', labels: { color: '#f3f4f6' } }, title: { display: true, text: 'Velocity Tracking', color: '#f3f4f6', font: { size: 14, weight: 'bold' } } }
        }
      });
    }

    // Innovation chart
    if (innovationChartRef.current) {
      controllerRef.current.registerChart('innovation', innovationChartRef.current, {
        data: {
          labels: [],
          datasets: [{ label: 'Innovation (z - ẑ)', data: [], borderColor: 'rgb(147, 51, 234)', backgroundColor: 'rgb(147, 51, 234)', borderWidth: 2, pointRadius: 0, tension: 0.1 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false, backgroundColor: '#1f2937',
          scales: {
            x: { title: { display: true, text: 'Time (s)', color: '#f3f4f6' }, ticks: { maxTicksLimit: 10, color: '#d1d5db', callback: (v) => Number(v).toFixed(2) }, grid: { color: '#374151' } },
            y: { title: { display: true, text: 'Innovation', color: '#f3f4f6' }, ticks: { color: '#d1d5db' }, grid: { color: '#374151' }, min: -1, max: 1 }
          },
          plugins: { zoom: createPanZoomConfig(), legend: { display: true, position: 'top', labels: { color: '#f3f4f6' } }, title: { display: true, text: 'Measurement Residual', color: '#f3f4f6', font: { size: 14, weight: 'bold' } } }
        }
      });
    }

    // Kalman Gain chart
    if (kalmanGainChartRef.current) {
      controllerRef.current.registerChart('kalmanGain', kalmanGainChartRef.current, {
        data: {
          labels: [],
          datasets: [
            { label: 'K[0] (Position)', data: [], borderColor: 'rgb(59, 130, 246)', backgroundColor: 'rgb(59, 130, 246)', borderWidth: 2, pointRadius: 0, tension: 0.1 },
            { label: 'K[1] (Velocity)', data: [], borderColor: 'rgb(16, 185, 129)', backgroundColor: 'rgb(16, 185, 129)', borderWidth: 2, pointRadius: 0, tension: 0.1 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false, backgroundColor: '#1f2937',
          scales: {
            x: { title: { display: true, text: 'Time (s)', color: '#f3f4f6' }, ticks: { maxTicksLimit: 10, color: '#d1d5db', callback: (v) => Number(v).toFixed(2) }, grid: { color: '#374151' } },
            y: { title: { display: true, text: 'Kalman Gain', color: '#f3f4f6' }, ticks: { color: '#d1d5db' }, grid: { color: '#374151' }, min: 0, max: 1 }
          },
          plugins: { zoom: createPanZoomConfig(), legend: { display: true, position: 'top', labels: { color: '#f3f4f6' } }, title: { display: true, text: 'Kalman Gain (Measurement Trust)', color: '#f3f4f6', font: { size: 14, weight: 'bold' } } }
        }
      });
    }

    // Uncertainty chart
    if (uncertaintyChartRef.current) {
      controllerRef.current.registerChart('uncertainty', uncertaintyChartRef.current, {
        data: {
          labels: [],
          datasets: [
            { label: 'Position σ', data: [], borderColor: 'rgb(239, 68, 68)', backgroundColor: 'rgb(239, 68, 68)', borderWidth: 2, pointRadius: 0, tension: 0.1 },
            { label: 'Velocity σ', data: [], borderColor: 'rgb(249, 115, 22)', backgroundColor: 'rgb(249, 115, 22)', borderWidth: 2, pointRadius: 0, tension: 0.1 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false, backgroundColor: '#1f2937',
          scales: {
            x: { title: { display: true, text: 'Time (s)', color: '#f3f4f6' }, ticks: { maxTicksLimit: 10, color: '#d1d5db', callback: (v) => Number(v).toFixed(2) }, grid: { color: '#374151' } },
            y: { title: { display: true, text: 'Std Dev (σ)', color: '#f3f4f6' }, ticks: { color: '#d1d5db' }, grid: { color: '#374151' }, min: 0, max: 1 }
          },
          plugins: { zoom: createPanZoomConfig(), legend: { display: true, position: 'top', labels: { color: '#f3f4f6' } }, title: { display: true, text: 'Filter Uncertainty (Convergence)', color: '#f3f4f6', font: { size: 14, weight: 'bold' } } }
        }
      });
    }

    // Error chart
    if (errorChartRef.current) {
      controllerRef.current.registerChart('error', errorChartRef.current, {
        data: {
          labels: [],
          datasets: [{ label: 'Position Error', data: [], borderColor: 'rgb(220, 38, 38)', backgroundColor: 'rgba(220, 38, 38, 0.1)', borderWidth: 2, pointRadius: 0, tension: 0.1, fill: true }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false, backgroundColor: '#1f2937',
          scales: {
            x: { title: { display: true, text: 'Time (s)', color: '#f3f4f6' }, ticks: { maxTicksLimit: 10, color: '#d1d5db', callback: (v) => Number(v).toFixed(2) }, grid: { color: '#374151' } },
            y: { title: { display: true, text: '|Error|', color: '#f3f4f6' }, ticks: { color: '#d1d5db' }, grid: { color: '#374151' }, min: 0, max: 0.5 }
          },
          plugins: { zoom: createPanZoomConfig(), legend: { display: true, position: 'top', labels: { color: '#f3f4f6' } }, title: { display: true, text: 'Position Error (Performance)', color: '#f3f4f6', font: { size: 14, weight: 'bold' } } }
        }
      });
    }

    // After all charts are registered, refresh them with current simulation data
    controllerRef.current.refreshCharts();
  }, [activeTabId]); // Re-run when switching tabs to register charts

  // Event handlers
  const handleTabChange = (tabId) => {
    controllerRef.current.setActiveTab(tabId);
  };

  const handleTabClose = (tabId) => {
    controllerRef.current.removeTab(tabId);
  };

  const handleTabRename = (tabId, newName) => {
    controllerRef.current.renameTab(tabId, newName);
  };

  const handleAddTab = () => {
    const newTabId = controllerRef.current.addTab();
    controllerRef.current.setActiveTab(newTabId);
  };

  const handleStart = () => {
    controllerRef.current.start();
  };

  const handlePause = () => {
    controllerRef.current.pause();
  };

  const handleReset = () => {
    controllerRef.current.reset();
  };

  const handleRestart = () => {
    controllerRef.current.restart();
  };

  const handleClearHistory = () => {
    controllerRef.current.clearHistory();
  };

  const handleRecord = () => {
    controllerRef.current.downloadDebugLog();
  };

  const handleTimelineChange = (position) => {
    controllerRef.current.handleTimelineChange(position);
  };

  const handleParameterChange = (name, value) => {
    controllerRef.current.setParameter(name, value);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <div className="p-4 bg-gray-800 border-b border-gray-700">
        <h1 className="text-2xl font-bold mb-1 text-white">Extended Kalman Filter: Wave Tracking</h1>
        <p className="text-gray-300 text-sm">
          Explore model mismatch in real-time: Change parameters while simulating to see immediate effects.
        </p>

        {/* Tab Bar */}
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabChange={handleTabChange}
          onTabClose={handleTabClose}
          onTabRename={handleTabRename}
          onAddTab={handleAddTab}
        />
      </div>

      {/* Welcome Screen */}
      {activeTabId === 'welcome' && (
        <WelcomeScreen onCreateSimulation={handleAddTab} />
      )}

      {/* Simulation Content */}
      {activeTabId !== 'welcome' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 overflow-hidden bg-gray-900">
          {/* LEFT COLUMN: Controls */}
          <div className="space-y-3 overflow-y-auto pr-2" style={{maxHeight: 'calc(100vh - 120px)'}}>
            <ControlPanel
              isRunning={isRunning}
              timelinePosition={timelineInfo.position}
              currentTime={timelineInfo.currentTime}
              endTime={timelineInfo.endTime}
              totalPoints={timelineInfo.totalPoints}
              onStart={handleStart}
              onPause={handlePause}
              onReset={handleReset}
              onRestart={handleRestart}
              onRecord={handleRecord}
              onTimelineChange={handleTimelineChange}
            />
            <ParameterControls
              parameters={parameters}
              onParameterChange={handleParameterChange}
            />
          </div>

          {/* RIGHT SIDE: Charts */}
          <div className="lg:col-span-3 overflow-y-auto pr-2" style={{maxHeight: 'calc(100vh - 120px)'}}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Row 1: Position Tracking (spanning 2 cols) */}
              <div className="md:col-span-2 h-80">
                <ChartCanvas ref={positionChartRef} />
              </div>

              {/* Row 2: Acceleration | Velocity */}
              <div className="h-64">
                <ChartCanvas ref={accelChartRef} />
              </div>
              <div className="h-64">
                <ChartCanvas ref={velocityChartRef} />
              </div>

              {/* Row 3: Innovation | Kalman Gain */}
              <div className="h-64">
                <ChartCanvas ref={innovationChartRef} />
              </div>
              <div className="h-64">
                <ChartCanvas ref={kalmanGainChartRef} />
              </div>

              {/* Row 4: Uncertainty | Position Error */}
              <div className="h-64">
                <ChartCanvas ref={uncertaintyChartRef} />
              </div>
              <div className="h-64">
                <ChartCanvas ref={errorChartRef} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export to global scope
window.EKFVisualization = EKFVisualization;
