import { useEffect, useRef, useState } from 'react';
import type { ExpeditionState } from './types/battle';
import {
  acceptWolf,
  createInitialState,
  dispatch,
  goHomeForRedispatch,
  pickDemoWaitMs,
  settle,
  setForceFailMode,
  tickElapsed,
} from './store/expeditionStore';
import { HomeScreen } from './components/screens/HomeScreen';
import { InProgressScreen } from './components/screens/InProgressScreen';
import { ReturnScreen } from './components/screens/ReturnScreen';
import './App.css';

function App() {
  const [state, setState] = useState<ExpeditionState>(() => createInitialState(true));
  const startRef = useRef<number>(0);
  const missionKey = state.activeMission?.mission_id ?? null;

  /** 進入 in_progress 後：演示等待 2–4s → settle；無取消 */
  useEffect(() => {
    if (state.screen !== 'in_progress' || !missionKey) return;

    startRef.current = Date.now();
    const waitMs = pickDemoWaitMs();

    const tickId = window.setInterval(() => {
      const sec = Math.max(0, Math.round((Date.now() - startRef.current) / 1000));
      setState((cur) => tickElapsed(cur, sec));
    }, 250);

    const timerId = window.setTimeout(() => {
      const elapsed = Math.max(
        2,
        Math.min(4, Math.round((Date.now() - startRef.current) / 1000)),
      );
      setState((cur) => settle(cur, elapsed));
    }, waitMs);

    return () => {
      window.clearInterval(tickId);
      window.clearTimeout(timerId);
    };
    // 僅在 mission 身份變化時啟動；勿依賴整份 state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.screen, missionKey]);

  const handleAcceptWolf = () => {
    setState((s) => acceptWolf(s));
  };

  const handleDispatch = () => {
    setState((s) => {
      const result = dispatch(s);
      return result.state;
    });
  };

  const handleRedispatch = () => {
    setState((s) => goHomeForRedispatch(s));
  };

  const handleToggleForceFail = () => {
    setState((s) => setForceFailMode(s, !s.forceFailMode));
  };

  return (
    <div className="app-shell">
      <div className="app-frame">
        {state.screen === 'home' && (
          <HomeScreen
            state={state}
            onAcceptWolf={handleAcceptWolf}
            onDispatch={handleDispatch}
            onToggleForceFail={handleToggleForceFail}
          />
        )}
        {state.screen === 'in_progress' && <InProgressScreen state={state} />}
        {state.screen === 'return' && (
          <ReturnScreen state={state} onRedispatch={handleRedispatch} />
        )}
      </div>
    </div>
  );
}

export default App;
