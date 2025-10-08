"use client";
import { useEffect, useRef } from "react";
import { newInstance, BrowserJsPlumbInstance } from "@jsplumb/browser-ui";

export default function WorkflowEditor() {
    const containerRef = useRef<HTMLDivElement>(null);
    const jsPlumbInstanceRef = useRef<BrowserJsPlumbInstance | null>(null);
    const blockCounter = useRef(2);

    // 🎨 Couleurs
    const colorMap: Record<string, string> = {
        "Start": "bg-green-400",
        "End": "bg-red-400",
        "Task": "bg-blue-400",
        "Subprocess": "bg-blue-500",
        "Condition (IF)": "bg-orange-400",
        "Switch / Case": "bg-orange-500",
        "Wait / Delay": "bg-yellow-400",
        "Parallel (Fork)": "bg-yellow-500",
        "Merge / Join": "bg-yellow-600",
        "Input": "bg-purple-400",
        "Output": "bg-purple-500",
        "API Call": "bg-pink-400",
        "Script / Code": "bg-pink-500",
        "Decision AI": "bg-pink-600",
    };

    useEffect(() => {
        if (!containerRef.current) return;

        const instance = newInstance({
            container: containerRef.current,
            paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
            endpointStyle: { fill: "#4A90E2", radius: 4 },
            connector: { type: "Bezier", options: { curviness: 50 } },
        });

        jsPlumbInstanceRef.current = instance;

        const blocks = ["start", "task", "end"];
        blocks.forEach((id) => {
            const el = document.getElementById(id)!;
            instance.manage(el);
            addEndpoints(instance, el);
        });

        instance.bind("beforeDrop", (params) => {
            const sourceId = params.sourceId;
            const targetId = params.targetId;

            if (sourceId === targetId) return false;
            const existingConnections = instance.getConnections({ source: sourceId, target: targetId });
            if (Array.isArray(existingConnections) && existingConnections.length > 0) return false;
            const existingOut = instance.getConnections({ source: sourceId });
            if (Array.isArray(existingOut) && existingOut.length >= 1) return false;
            const existingIn = instance.getConnections({ target: targetId });
            if (Array.isArray(existingIn) && existingIn.length >= 1) return false;

            return true;
        });

        return () => {
            instance.destroy();
        };
    }, []);

    // ⚙️ Ajout des endpoints
    function addEndpoints(instance: BrowserJsPlumbInstance, el: HTMLElement) {
        instance.addEndpoint(el, { anchor: "Right", endpoint: "Dot", maxConnections: 1, source: true });
        instance.addEndpoint(el, { anchor: "Left", endpoint: "Dot", maxConnections: 1, target: true });
        instance.setDraggable(el, true);
    }

    // 🧩 Création dynamique
    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        const type = e.dataTransfer.getData("block-type");
        const container = containerRef.current;
        if (!container || !jsPlumbInstanceRef.current) return;

        const newId = `block-${blockCounter.current++}`;
        const colorClass = colorMap[type] || "bg-gray-300";
        const newBlock = document.createElement("div");
        newBlock.id = newId;

        // 🟢 Cas spécial : Start / End => rond plein
        if (type === "Start" || type === "End") {
            newBlock.className = `${colorClass} absolute w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold border border-black cursor-move`;
            newBlock.textContent = type;
        } else {
            // Bloc standard avec header coloré et corps blanc
            newBlock.className =
                "absolute w-40 h-24 bg-white border border-black rounded-md shadow-sm overflow-hidden cursor-move flex flex-col";
            const header = document.createElement("div");
            header.className = `${colorClass} text-white text-xs font-semibold text-center py-1 border-b border-black`;
            header.textContent = type;

            const body = document.createElement("div");
            body.className =
                "flex-1 flex items-center justify-center text-xs text-gray-700 bg-white px-1 text-center";
            body.textContent = "Double-clique pour éditer";

            newBlock.appendChild(header);
            newBlock.appendChild(body);
        }

        newBlock.style.top = `${e.nativeEvent.offsetY}px`;
        newBlock.style.left = `${e.nativeEvent.offsetX}px`;

        // ✏️ Rendre le texte éditable sur double-clic
        newBlock.addEventListener("dblclick", () => enableEditing(newBlock));

        container.appendChild(newBlock);
        jsPlumbInstanceRef.current.manage(newBlock);
        addEndpoints(jsPlumbInstanceRef.current, newBlock);
    }

    // ✏️ Fonction d’édition du texte
    function enableEditing(block: HTMLElement) {
        // Pour Start/End on ne fait rien
        if (block.textContent === "Start" || block.textContent === "End") return;

        const body = block.querySelector("div:last-child") as HTMLElement;
        if (!body) return;

        const textarea = document.createElement("textarea");
        textarea.value = body.textContent || "";
        textarea.className =
            "w-full h-full p-1 text-xs border border-gray-400 rounded resize-none focus:outline-none";

        body.replaceChildren(textarea);
        textarea.focus();

        textarea.addEventListener("blur", () => {
            body.textContent = textarea.value || "Double-clique pour éditer";
        });
    }

    return (
        <div className="w-screen h-screen flex gap-4">
            {/* Menu latéral */}
            <div className="w-56 border border-gray-300 rounded-md p-3 flex flex-col gap-3 bg-gray-50 overflow-y-auto h-full">
                <h3 className="font-semibold text-center mb-1">🧱 Blocs disponibles</h3>

                {[
                    { label: "Début / Fin", blocks: ["Start", "End"] },
                    { label: "Actions", blocks: ["Task"] },
                    { label: "Conditions", blocks: ["Condition (IF)", "Switch / Case"] },
                    { label: "Entrées / Sorties", blocks: ["Input", "Output"] },
                ].map((group) => (
                    <div key={group.label}>
                        <h4 className="font-medium text-sm mb-1 text-gray-700">{group.label}</h4>
                        {group.blocks.map((type) => (
                            <div
                                key={type}
                                draggable
                                onDragStart={(e) =>
                                    e.dataTransfer.setData("block-type", type)
                                }
                                className="p-2 mb-2 bg-gray-200 rounded-md text-center cursor-grab hover:bg-gray-300"
                            >
                                {type}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Zone de workflow */}
            <div
                ref={containerRef}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="relative flex-1 border border-gray-300 rounded-md bg-white"
            >
                {/* Bloc Start initial */}
                <div
                    id="start"
                    className="absolute top-10 left-10 w-16 h-16 bg-green-400 rounded-full flex items-center justify-center text-white font-semibold border border-black cursor-move"
                >
                    Start
                </div>

                {/* Bloc Task initial */}
                <div
                    id="task"
                    className="absolute top-10 left-[200px] w-40 h-24 bg-white border border-black rounded-md flex flex-col overflow-hidden cursor-move"
                    onDoubleClick={() => enableEditing(document.getElementById('task')!)}
                >
                    <div className="bg-blue-400 text-white text-xs font-semibold text-center py-1 border-b border-black">
                        Task
                    </div>
                    <div className="flex-1 flex items-center justify-center text-xs text-gray-700">
                        Double-clique pour éditer
                    </div>
                </div>

                {/* Bloc End initial */}
                <div
                    id="end"
                    className="absolute top-10 left-[400px] w-16 h-16 bg-red-400 rounded-full flex items-center justify-center text-white font-semibold border border-black cursor-move"
                >
                    End
                </div>
            </div>
        </div>
    );
}
