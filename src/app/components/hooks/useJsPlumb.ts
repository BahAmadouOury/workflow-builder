import { useEffect, useRef } from 'react';
import { newInstance, BrowserJsPlumbInstance } from '@jsplumb/browser-ui';

export const useJsPlumb = (containerRef: React.RefObject<HTMLDivElement | null>) => {
  const jsPlumbInstanceRef = useRef<BrowserJsPlumbInstance | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const instance = newInstance({
      container: containerRef.current,
      paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
      endpointStyle: { fill: "#4A90E2", radius: 4 },
      connector: { type: "StateMachine", options: {} },
    });

    jsPlumbInstanceRef.current = instance;

    return () => instance.destroy();
  }, [containerRef]);

  const addEndpoints = (instance: BrowserJsPlumbInstance, el: HTMLElement) => {
    instance.addEndpoint(el, { anchor: "Right", endpoint: "Dot", source: true });
    instance.addEndpoint(el, { anchor: "Left", endpoint: "Dot", target: true });
    instance.setDraggable(el, true);
  };

  return {
    jsPlumbInstanceRef,
    addEndpoints
  };
};
