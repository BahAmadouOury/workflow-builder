"use client";
import { useEffect, useRef } from "react";
import { newInstance, BrowserJsPlumbInstance } from "@jsplumb/browser-ui";

export default function WorkflowEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const jsPlumbInstanceRef = useRef<BrowserJsPlumbInstance | null>(null);
  const blockCounter = useRef(2);

  const colorMap: Record<string, string> = {
    "Start": "bg-green-400",
    "End": "bg-red-400",
    "Task": "bg-blue-400",
    "Condition (IF)": "bg-orange-400",
    "Switch / Case": "bg-orange-500",
    "Input": "bg-purple-400",
    "Output": "bg-purple-500",
  };

  // ----------------------- INIT JSPLUMB -----------------------
  useEffect(() => {
    if (!containerRef.current) return;

    const instance = newInstance({
      container: containerRef.current,
      paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
      endpointStyle: { fill: "#4A90E2", radius: 4 },
      connector: { type: "Bezier", options: { curviness: 50 } },
    });

    jsPlumbInstanceRef.current = instance;

    const blocks = ["start", "end"];
    blocks.forEach((id) => {
      const el = document.getElementById(id)!;
      instance.manage(el);
      addEndpoints(instance, el);
    });

    return () => instance.destroy();
  }, []);

  // ----------------------- ENDPOINTS -----------------------
  function addEndpoints(instance: BrowserJsPlumbInstance, el: HTMLElement) {
    instance.addEndpoint(el, { anchor: "Right", endpoint: "Dot", source: true });
    instance.addEndpoint(el, { anchor: "Left", endpoint: "Dot", target: true });
    instance.setDraggable(el, true);
  }

  // ----------------------- CREATION BLOCS -----------------------
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const type = e.dataTransfer.getData("block-type");
    const container = containerRef.current;
    if (!container || !jsPlumbInstanceRef.current) return;

    const newId = `block-${blockCounter.current++}`;
    const colorClass = colorMap[type] || "bg-gray-300";
    const newBlock = document.createElement("div");
    newBlock.id = newId;

    if (type === "Start" || type === "End") {
      newBlock.className = `${colorClass} absolute w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold border border-black cursor-move`;
      newBlock.textContent = type;
    } else {
      newBlock.className =
        "absolute w-44 h-28 bg-white border border-gray-400 rounded-lg shadow-md flex flex-col overflow-hidden cursor-move";
      const header = document.createElement("div");
      header.className = `${colorClass} text-white text-xs font-semibold text-center py-1 border-b border-gray-400`;
      header.textContent = type;

      const body = document.createElement("div");
      body.className =
        "flex-1 flex items-center justify-center text-xs text-gray-700 bg-white px-2 text-center";
      body.textContent = "Double-clique pour éditer";

      newBlock.appendChild(header);
      newBlock.appendChild(body);
    }

    newBlock.style.top = `${e.nativeEvent.offsetY}px`;
    newBlock.style.left = `${e.nativeEvent.offsetX}px`;

    container.appendChild(newBlock);
    jsPlumbInstanceRef.current.manage(newBlock);
    addEndpoints(jsPlumbInstanceRef.current, newBlock);
  }


  function exportWorkflow() {
    if (!jsPlumbInstanceRef.current || !containerRef.current) return;
  
    // 🔹 Récupération des blocs
    const blocks = Array.from(containerRef.current.children)
      .filter((el) => el.id && !el.classList.contains("jtk-endpoint"))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const containerRect = containerRef.current!.getBoundingClientRect();
        const type =
          el.querySelector("div:first-child")?.textContent || el.textContent;
        const body = el.querySelector("div:last-child")?.textContent?.trim() || "";
        return {
          id: el.id,
          type,
          top: rect.top - containerRect.top,
          left: rect.left - containerRect.left,
          content: body,
        };
      });
  
    // 🔹 Récupération des connexions
    const connectionsData = jsPlumbInstanceRef.current.getConnections();
    const connections = Array.isArray(connectionsData) 
      ? connectionsData 
      : Object.values(connectionsData);
    const connectionsList = connections.map((conn) => ({
      source: conn.sourceId,
      target: conn.targetId,
    }));
  
    const workflow = { blocks, connections: connectionsList };
  
    // 🖥️ Afficher dans la console
    console.clear();
    console.log("🧱 Structure du workflow :");
    console.log(workflow);
    console.log("📜 JSON formaté :");
    console.log(JSON.stringify(workflow, null, 2));
  }
  
 
  return (
    <div className="w-screen h-screen flex gap-4">
      {/* MENU LATÉRAL */}
      <div className="w-56 border border-gray-300 rounded-md p-3 flex flex-col gap-3 bg-gray-50 overflow-y-auto h-full">
        <h3 className="font-semibold text-center mb-1">🧱 Blocs disponibles</h3>

        {/* Boutons sauvegarde */}
        <div className="flex flex-col gap-2 mb-4">
          <button
            onClick={exportWorkflow}
            className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-1 rounded"
          >
            💾 Exporter Workflow
          </button>
          <label className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-1 rounded text-center cursor-pointer">
            📂 Importer Workflow
            <input
              type="file"
              accept="application/json"
            //   onChange={importWorkflow}
              className="hidden"
            />
          </label>
        </div>

        {[{ label: "Début / Fin", blocks: ["Start", "End"] },
          { label: "Actions", blocks: ["Task"] },
          { label: "Conditions", blocks: ["Condition (IF)", "Switch / Case"] },
          { label: "Entrées / Sorties", blocks: ["Input", "Output"] }
        ].map((group) => (
          <div key={group.label}>
            <h4 className="font-medium text-sm mb-1 text-gray-700">{group.label}</h4>
            {group.blocks.map((type) => (
              <div
                key={type}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("block-type", type)}
                className="p-2 mb-2 bg-gray-200 rounded-md text-center cursor-grab hover:bg-gray-300"
              >
                {type}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ZONE DE WORKFLOW */}
      <div
        ref={containerRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="relative flex-1 border border-gray-300 rounded-md bg-white"
      >
        <div
          id="start"
          className="absolute top-20 left-20 w-16 h-16 bg-green-400 rounded-full flex items-center justify-center text-white font-semibold border border-black cursor-move"
        >
          Start
        </div>

        <div
          id="end"
          className="absolute top-20 left-[200px] w-16 h-16 bg-red-400 rounded-full flex items-center justify-center text-white font-semibold border border-black cursor-move"
        >
          End
        </div>
      </div>
    </div>
  );
}
