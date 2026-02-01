/**
 * Main Application View
 * Integrates MVC components into the main React app
 */

const { useState, useEffect, useRef, useReducer, useCallback } = React;
const { TabBar, WelcomeScreen, ControlPanel, ParameterControls, ChartCanvas, ProblemTypeSelector, SimulationGrid, EKFFlowchart } = window;

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

  // Chart grid container ref for GIF recording
  const chartGridRef = useRef(null);

  // Force re-render when controller state changes
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  // UI state (managed by React, not controller)
  const [tabs, setTabs] = useState([{ id: 'welcome', name: 'Welcome', type: 'welcome' }]);
  const [activeTabId, setActiveTabId] = useState('welcome');
  const [isRunning, setIsRunning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);
  const [parameters, setParameters] = useState({});
  const [timelineInfo, setTimelineInfo] = useState({ position: 100, currentTime: 0, endTime: 0, totalPoints: 0 });
  const [splashProgress, setSplashProgress] = useState({ frequency: { progress: 0, active: false }, amplitude: { progress: 0, active: false } });

  // Header revamp state (slot-based)
  const [problemTypes, setProblemTypes] = useState([]);
  const [activeProblemTypeId, setActiveProblemTypeId] = useState('simple-wave');
  const [currentSlots, setCurrentSlots] = useState([]);
  const [currentColumns, setCurrentColumns] = useState(1);
  const [activeSlotId, setActiveSlotId] = useState('welcome');

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
    setIsRecording(controllerRef.current.getIsRecording());

    // Sync slot-based state
    setProblemTypes(controllerRef.current.problemTypeModel.getAllProblemTypes());
    setActiveProblemTypeId(controllerRef.current.problemTypeModel.getActiveProblemType().id);
    setCurrentSlots(controllerRef.current.getSlotsForCurrentProblemType());
    setCurrentColumns(controllerRef.current.getColumnCountForCurrentProblemType());
    setActiveSlotId(controllerRef.current.tabModel.getActiveSlotId());

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

    unsubscribers.push(controllerRef.current.subscribe('recording-changed', (recording) => {
      setIsRecording(recording);
      forceUpdate();
    }));

    unsubscribers.push(controllerRef.current.subscribe('gif-generating-changed', (generating) => {
      setIsGeneratingGif(generating);
      forceUpdate();
    }));

    unsubscribers.push(controllerRef.current.subscribe('splash-progress', (data) => {
      setSplashProgress(prev => ({
        ...prev,
        [data.type]: { progress: data.progress, active: data.active }
      }));
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

    // Slot-based event subscriptions
    unsubscribers.push(controllerRef.current.subscribe('problem-type-changed', ({ problemTypeId }) => {
      setActiveProblemTypeId(problemTypeId);
      setCurrentSlots(controllerRef.current.getSlotsForCurrentProblemType());
      setCurrentColumns(controllerRef.current.getColumnCountForCurrentProblemType());
      forceUpdate();
    }));

    unsubscribers.push(controllerRef.current.subscribe('slot-activated', ({ slotId }) => {
      setActiveSlotId(slotId);
      forceUpdate();
    }));

    unsubscribers.push(controllerRef.current.subscribe('slot-renamed', () => {
      setCurrentSlots(controllerRef.current.getSlotsForCurrentProblemType());
      forceUpdate();
    }));

    unsubscribers.push(controllerRef.current.subscribe('slot-reset', () => {
      setCurrentSlots(controllerRef.current.getSlotsForCurrentProblemType());
      forceUpdate();
    }));

    unsubscribers.push(controllerRef.current.subscribe('column-added', () => {
      setCurrentSlots(controllerRef.current.getSlotsForCurrentProblemType());
      setCurrentColumns(controllerRef.current.getColumnCountForCurrentProblemType());
      forceUpdate();
    }));

    // Cleanup on unmount
    return () => {
      unsubscribers.forEach(unsub => unsub());
      if (controllerRef.current) {
        controllerRef.current.destroy();
      }
    };
  }, []);

  // Callback ref for chart grid element (sets immediately when element renders)
  const chartGridRefCallback = useCallback((element) => {
    chartGridRef.current = element;
    if (element && controllerRef.current) {
      controllerRef.current.setChartGridElement(element);
    }
  }, []);

  // Track drag state for custom pan handling
  const dragStateRef = useRef({ isDragging: false, startX: 0, startPosition: 0 });

  // Custom drag handlers for timeline navigation (when paused)
  const handleChartMouseDown = (e) => {
    if (controllerRef.current?.getIsRunning()) return;  // Only when paused

    const timelineInfo = controllerRef.current?.getTimelineInfo() || { position: 100, totalPoints: 0 };
    if (timelineInfo.totalPoints < 400) return;  // Need history to navigate

    dragStateRef.current = {
      isDragging: true,
      startX: e.clientX,
      startPosition: timelineInfo.position
    };
  };

  const handleChartMouseMove = (e) => {
    if (!dragStateRef.current.isDragging) return;
    if (!controllerRef.current) return;

    const timelineInfo = controllerRef.current.getTimelineInfo();
    if (timelineInfo.totalPoints === 0) return;

    // Calculate drag delta in pixels
    const deltaX = e.clientX - dragStateRef.current.startX;

    // Use the chart grid ref for consistent width
    const chartWidth = chartGridRef.current?.offsetWidth || 800;
    const viewportPercent = 100 * (400 / timelineInfo.totalPoints);

    // Drag right = pull content right = see earlier data = decrease position
    // Drag left = pull content left = see later data = increase position
    const deltaPercent = -(deltaX / chartWidth) * viewportPercent;

    const newPosition = Math.max(0, Math.min(100, dragStateRef.current.startPosition + deltaPercent));
    controllerRef.current.handleTimelineChange(newPosition);
  };

  const handleChartMouseUp = (e) => {
    if (dragStateRef.current.isDragging) {
      dragStateRef.current.isDragging = false;
      e.target.style.cursor = 'grab';
    }
  };

  const handleChartMouseLeave = (e) => {
    if (dragStateRef.current.isDragging) {
      dragStateRef.current.isDragging = false;
      e.target.style.cursor = '';
    }
  };

  // Pan/zoom configuration for Chart.js plugin (zoom only, pan disabled)
  const createPanZoomConfig = () => ({
    pan: {
      enabled: false  // Using custom drag handler instead
    },
    zoom: {
      wheel: {
        enabled: false  // Disabled to allow page scrolling (BUG-9)
      },
      pinch: {
        enabled: true,
        mode: 'x'
      },
      mode: 'x'
    },
    limits: {
      x: {
        min: 'original',
        max: 'original',
        minRange: 0.01
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
    if (activeSlotId === 'welcome') return; // Don't register charts on welcome slot

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
            x: { title: { display: true, text: 'Time (s)', color: '#f3f4f6' }, ticks: { maxTicksLimit: 10, color: '#d1d5db', callback: function(v, index, ticks) {
              const actualTime = this.chart.data.labels[index];
              return Number(actualTime).toFixed(2);
            } }, grid: { color: '#374151' } },
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
            x: { title: { display: true, text: 'Time (s)', color: '#f3f4f6' }, ticks: { maxTicksLimit: 10, color: '#d1d5db', callback: function(v, index, ticks) {
              const actualTime = this.chart.data.labels[index];
              return Number(actualTime).toFixed(2);
            } }, grid: { color: '#374151' } },
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
            x: { title: { display: true, text: 'Time (s)', color: '#f3f4f6' }, ticks: { maxTicksLimit: 10, color: '#d1d5db', callback: function(v, index, ticks) {
              const actualTime = this.chart.data.labels[index];
              return Number(actualTime).toFixed(2);
            } }, grid: { color: '#374151' } },
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
            x: { title: { display: true, text: 'Time (s)', color: '#f3f4f6' }, ticks: { maxTicksLimit: 10, color: '#d1d5db', callback: function(v, index, ticks) {
              const actualTime = this.chart.data.labels[index];
              return Number(actualTime).toFixed(2);
            } }, grid: { color: '#374151' } },
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
            x: { title: { display: true, text: 'Time (s)', color: '#f3f4f6' }, ticks: { maxTicksLimit: 10, color: '#d1d5db', callback: function(v, index, ticks) {
              const actualTime = this.chart.data.labels[index];
              return Number(actualTime).toFixed(2);
            } }, grid: { color: '#374151' } },
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
            x: { title: { display: true, text: 'Time (s)', color: '#f3f4f6' }, ticks: { maxTicksLimit: 10, color: '#d1d5db', callback: function(v, index, ticks) {
              const actualTime = this.chart.data.labels[index];
              return Number(actualTime).toFixed(2);
            } }, grid: { color: '#374151' } },
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
            x: { title: { display: true, text: 'Time (s)', color: '#f3f4f6' }, ticks: { maxTicksLimit: 10, color: '#d1d5db', callback: function(v, index, ticks) {
              const actualTime = this.chart.data.labels[index];
              return Number(actualTime).toFixed(2);
            } }, grid: { color: '#374151' } },
            y: { title: { display: true, text: '|Error|', color: '#f3f4f6' }, ticks: { color: '#d1d5db' }, grid: { color: '#374151' }, min: 0, max: 0.5 }
          },
          plugins: { zoom: createPanZoomConfig(), legend: { display: true, position: 'top', labels: { color: '#f3f4f6' } }, title: { display: true, text: 'Position Error (Performance)', color: '#f3f4f6', font: { size: 14, weight: 'bold' } } }
        }
      });
    }

    // After all charts are registered, refresh them with current simulation data
    controllerRef.current.refreshCharts();
  }, [activeSlotId]); // Re-run when switching slots to register charts

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

  const handleToggleRecording = () => {
    controllerRef.current.toggleRecording();
  };

  const handleTimelineChange = (position) => {
    controllerRef.current.handleTimelineChange(position);
  };

  const handleParameterChange = (name, value) => {
    controllerRef.current.setParameter(name, value);
  };

  // Splash hold-to-sustain handlers
  const handleSplashFrequencyStart = () => {
    controllerRef.current.splashFrequencyStart();
  };
  const handleSplashFrequencyEnd = () => {
    controllerRef.current.splashFrequencyEnd();
  };
  const handleSplashAmplitudeStart = () => {
    controllerRef.current.splashAmplitudeStart();
  };
  const handleSplashAmplitudeEnd = () => {
    controllerRef.current.splashAmplitudeEnd();
  };

  // Header revamp handlers (slot-based)
  const handleProblemTypeChange = (problemTypeId) => {
    controllerRef.current.setProblemType(problemTypeId);
  };

  const handleSlotClick = (slotId) => {
    controllerRef.current.setActiveSlot(slotId);
  };

  const handleSlotRename = (slotId, newName) => {
    controllerRef.current.renameSlot(slotId, newName);
  };

  const handleSlotReset = (slotId) => {
    controllerRef.current.resetSlot(slotId);
  };

  const handleAddColumn = () => {
    controllerRef.current.addColumnToProblemType(activeProblemTypeId);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header - Three Section Layout */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 px-24 py-4 items-center">
          {/* Left: Problem Type Selector */}
          <ProblemTypeSelector
            problemTypes={problemTypes}
            activeProblemTypeId={activeProblemTypeId}
            onProblemTypeChange={handleProblemTypeChange}
          />

          {/* Center: Simulation Grid + EKF Flowchart */}
          <SimulationGrid
            slots={currentSlots.map(slot => ({
              ...slot,
              isActive: slot.id === activeSlotId
            }))}
            columns={currentColumns}
            onSlotClick={handleSlotClick}
            onSlotRename={handleSlotRename}
            onSlotReset={handleSlotReset}
            onAddColumn={handleAddColumn}
          >
            {/* EKF Flowchart (horizontal) - after + button */}
            <div className="overflow-visible">
              <EKFFlowchart direction="horizontal" compact={true} />
            </div>
          </SimulationGrid>

          {/* Right: Title */}
          <div className="text-right pr-4">
            <h1 className="text-2xl font-bold text-white whitespace-nowrap">
              EKF: {problemTypes.find(pt => pt.id === activeProblemTypeId)?.name || 'Wave Tracking'}
            </h1>
          </div>
        </div>
      </div>

      {/* Welcome Screen */}
      {activeSlotId === 'welcome' && (
        <WelcomeScreen
          onCreateSimulation={handleAddTab}
          problemType={problemTypes.find(pt => pt.id === activeProblemTypeId)}
        />
      )}

      {/* Simulation Content */}
      {activeSlotId !== 'welcome' && (
        <div className="flex-1 flex gap-4 px-24 py-4 overflow-hidden bg-gray-900">
          {/* LEFT COLUMN: Controls - Fixed width, always visible */}
          <div className="flex-shrink-0 space-y-3 overflow-y-auto pr-2" style={{maxHeight: 'calc(100vh - 120px)', width: '320px'}}>
            <ControlPanel
              isRunning={isRunning}
              isRecording={isRecording}
              isGeneratingGif={isGeneratingGif}
              timelinePosition={timelineInfo.position}
              currentTime={timelineInfo.currentTime}
              endTime={timelineInfo.endTime}
              totalPoints={timelineInfo.totalPoints}
              onStart={handleStart}
              onPause={handlePause}
              onReset={handleReset}
              onRestart={handleRestart}
              onToggleRecording={handleToggleRecording}
              onTimelineChange={handleTimelineChange}
            />
            <ParameterControls
              parameters={parameters}
              onParameterChange={handleParameterChange}
              onSplashFrequencyStart={handleSplashFrequencyStart}
              onSplashFrequencyEnd={handleSplashFrequencyEnd}
              onSplashAmplitudeStart={handleSplashAmplitudeStart}
              onSplashAmplitudeEnd={handleSplashAmplitudeEnd}
              splashProgress={splashProgress}
            />
          </div>

          {/* RIGHT SIDE: Charts - Can overflow to the right */}
          <div className="flex-1 overflow-x-auto pr-2" style={{maxHeight: 'calc(100vh - 120px)', minWidth: 0, overflowY: 'scroll'}}>
            <div
              ref={chartGridRefCallback}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              style={{minWidth: '800px', cursor: isRunning ? 'default' : 'grab'}}
              onMouseDown={handleChartMouseDown}
              onMouseMove={handleChartMouseMove}
              onMouseUp={handleChartMouseUp}
              onMouseLeave={handleChartMouseLeave}
            >
              {/* Row 1: Position Tracking (spanning 2 cols) */}
              <div className="md:col-span-2 h-80 rounded-xl shadow-lg p-3" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%), linear-gradient(135deg, rgb(31, 41, 55), rgb(15, 23, 42))'}}>
                <ChartCanvas ref={positionChartRef} />
              </div>

              {/* Row 2: Acceleration | Velocity */}
              <div className="h-64 rounded-xl shadow-lg p-3" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%), linear-gradient(135deg, rgb(31, 41, 55), rgb(15, 23, 42))'}}>
                <ChartCanvas ref={accelChartRef} />
              </div>
              <div className="h-64 rounded-xl shadow-lg p-3" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%), linear-gradient(135deg, rgb(31, 41, 55), rgb(15, 23, 42))'}}>
                <ChartCanvas ref={velocityChartRef} />
              </div>

              {/* Row 3: Innovation | Kalman Gain */}
              <div className="h-64 rounded-xl shadow-lg p-3" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%), linear-gradient(135deg, rgb(31, 41, 55), rgb(15, 23, 42))'}}>
                <ChartCanvas ref={innovationChartRef} />
              </div>
              <div className="h-64 rounded-xl shadow-lg p-3" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%), linear-gradient(135deg, rgb(31, 41, 55), rgb(15, 23, 42))'}}>
                <ChartCanvas ref={kalmanGainChartRef} />
              </div>

              {/* Row 4: Uncertainty | Position Error */}
              <div className="h-64 rounded-xl shadow-lg p-3" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%), linear-gradient(135deg, rgb(31, 41, 55), rgb(15, 23, 42))'}}>
                <ChartCanvas ref={uncertaintyChartRef} />
              </div>
              <div className="h-64 rounded-xl shadow-lg p-3" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%), linear-gradient(135deg, rgb(31, 41, 55), rgb(15, 23, 42))'}}>
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
