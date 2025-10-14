"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { newInstance, BrowserJsPlumbInstance } from "@jsplumb/browser-ui";

interface FieldDefinition {
  name: string;
  label: string;
  field_type: string;
  is_required: boolean;
  is_multiple: boolean;
  order: number;
  depends_on: string;
}

export default function WorkflowEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const jsPlumbInstanceRef = useRef<BrowserJsPlumbInstance | null>(null);
  const blockCounter = useRef(2);
  const [editingField, setEditingField] = useState<{blockId: string, fieldName: string} | null>(null);
  const [fieldData, setFieldData] = useState<Record<string, Record<string, string>>>({});
  const [blockFields, setBlockFields] = useState<Record<string, FieldDefinition[]>>({});

  const colorMap: Record<string, string> = {
    "Start": "bg-green-400",
    "End": "bg-red-400",
    "Task": "bg-blue-400",
    "Condition (IF)": "bg-orange-400",
    "Switch / Case": "bg-orange-500",
    "Input": "bg-purple-400",
    "Output": "bg-purple-500",
    // Workflow de vérification d'identité
    "Identity Choice": "bg-cyan-400",
    "ID Collection": "bg-blue-500",
    "Passport Collection": "bg-indigo-500",
    "Information Confirmation": "bg-yellow-400",
    "Identity Verification": "bg-orange-600",
    "Verification Success": "bg-green-500",
    "Verification Failed": "bg-red-500",
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

    // Pas de blocs par défaut - l'utilisateur peut créer ses propres blocs

    return () => instance.destroy();
  }, []);

  // ----------------------- GESTION DES ÉVÉNEMENTS DE CHAMPS -----------------------
  useEffect(() => {
    const handleFieldClickEvent = (e: Event) => {
      const target = e.target as HTMLElement;
      const fieldItem = target.closest('.field-item');
      if (fieldItem) {
        // Chercher le bloc parent avec n'importe quel ID
        const blockElement = fieldItem.closest('[id]');
        const blockId = blockElement?.id;
        const fieldName = fieldItem.getAttribute('data-field');
        
        console.log('Field clicked:', { blockId, fieldName, fieldItem }); // Debug
        console.log('Target element:', target); // Debug
        console.log('Field item found:', fieldItem); // Debug
        
        if (blockId && fieldName) {
          console.log('Calling handleFieldClick with:', { blockId, fieldName }); // Debug
          handleFieldClick(blockId, fieldName);
        } else {
          console.log('Missing blockId or fieldName:', { blockId, fieldName }); // Debug
        }
      }
    };

    const handleBlockDoubleClickEvent = (e: Event) => {
      const target = e.target as HTMLElement;
      const blockElement = target.closest('[id]');
      
      if (blockElement) {
        const blockId = blockElement.id;
        const blockType = blockElement.getAttribute('data-type') || 
                         blockElement.querySelector('div:first-child')?.textContent || 
                         blockElement.textContent;
        
        // Vérifier si c'est un bloc de collecte (ne pas permettre l'édition)
        if (blockType === "ID Collection" || blockType === "Passport Collection") {
          return;
        }
        
        // Déterminer si c'est l'en-tête ou le contenu
        const isHeader = target.closest('div:first-child') !== null;
        const editType = isHeader ? 'header' : 'content';
        
        console.log('Block double-clicked:', { blockId, blockType, editType }); // Debug
        
        // Rendre l'élément éditable directement
        setTimeout(() => {
          const element = editType === 'header' ? 
            blockElement.querySelector('div:first-child') : 
            blockElement.querySelector('div:last-child');
          
          if (element) {
            (element as HTMLElement).contentEditable = 'true';
            (element as HTMLElement).focus();
            
            // Sélectionner tout le texte
            const range = document.createRange();
            range.selectNodeContents(element);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        }, 10);
      }
    };

    const handleKeyDownEvent = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.contentEditable === 'true') {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          target.contentEditable = 'false';
          target.blur();
        }
      }
    };

    document.addEventListener('click', handleFieldClickEvent);
    document.addEventListener('dblclick', handleBlockDoubleClickEvent);
    document.addEventListener('keydown', handleKeyDownEvent);
    return () => {
      document.removeEventListener('click', handleFieldClickEvent);
      document.removeEventListener('dblclick', handleBlockDoubleClickEvent);
      document.removeEventListener('keydown', handleKeyDownEvent);
    };
  }, []);

  // ----------------------- SYNCHRONISATION DES CHAMPS -----------------------
  const syncFieldDisplay = useCallback((blockId: string) => {
    const block = document.getElementById(blockId);
    if (!block || !blockFields[blockId]) return;

    console.log('Syncing fields for block:', blockId, blockFields[blockId]); // Debug

    // Mettre à jour tous les champs visibles dans le bloc
    const fieldItems = block.querySelectorAll('.field-item');
    console.log('Found field items:', fieldItems.length); // Debug
    
    fieldItems.forEach((fieldItem, index) => {
      if (blockFields[blockId][index]) {
        const field = blockFields[blockId][index];
        fieldItem.textContent = `• ${field.label}`;
        console.log(`Updated field display: ${field.label}`); // Debug
      } else {
        console.log(`No field data for index ${index}`); // Debug
      }
    });
  }, [blockFields]);

  // ----------------------- MISE À JOUR DE L'AFFICHAGE DES CHAMPS -----------------------
  useEffect(() => {
    // Synchroniser l'affichage des champs quand blockFields change
    Object.keys(blockFields).forEach(blockId => {
      syncFieldDisplay(blockId);
    });
  }, [blockFields, syncFieldDisplay]);

  // ----------------------- GESTION DES CHAMPS -----------------------
  const handleFieldClick = useCallback((blockId: string, fieldName: string) => {
    console.log('handleFieldClick called:', { blockId, fieldName }); // Debug
    console.log('Setting editingField to:', { blockId, fieldName }); // Debug
    setEditingField({ blockId, fieldName });
  }, []);

  const handleFieldSave = useCallback((blockId: string, fieldName: string, value: string) => {
    setFieldData(prev => ({
      ...prev,
      [blockId]: {
        ...prev[blockId],
        [fieldName]: value
      }
    }));
    setEditingField(null);
    
    // Mettre à jour l'affichage du champ dans le bloc
    updateFieldDisplay(blockId, fieldName, value);
  }, []);

  const updateFieldDisplay = useCallback((blockId: string, fieldName: string, value: string) => {
    const block = document.getElementById(blockId);
    if (block) {
      const fieldItem = block.querySelector(`[data-field="${fieldName}"]`);
      if (fieldItem) {
        fieldItem.textContent = `• ${value}`;
        // console.log(`Updated field ${fieldName} in block ${blockId} with value: ${value}`);
      } else {
        // console.log(`Field ${fieldName} not found in block ${blockId}`);
      }
    } else {
      // console.log(`Block ${blockId} not found`);
    }
  }, []);

  const handleFieldCancel = useCallback(() => {
    setEditingField(null);
  }, []);

  const getFieldValue = useCallback((blockId: string, fieldName: string): string => {
    return fieldData[blockId]?.[fieldName] || fieldName;
  }, [fieldData]);

  // ----------------------- HANDLERS DU MODAL -----------------------
  const updateFieldProperty = useCallback((blockId: string, fieldIndex: number, property: keyof FieldDefinition, value: any) => {
    console.log(`Updating field property: ${property} = ${value} for block ${blockId}, field ${fieldIndex}`); // Debug
    
    setBlockFields(prev => {
      const currentFields = prev[blockId] || [];
      let newFields = [...currentFields];
      
      // Si c'est un nouveau champ (fieldIndex = -1), l'ajouter seulement si nécessaire
      if (fieldIndex === -1 && currentFields.length === 0) {
        const newField: FieldDefinition = {
          name: "nouveau_champ",
          label: "Nouveau Champ",
          field_type: "text",
          is_required: false,
          is_multiple: false,
          order: 0,
          depends_on: ""
        };
        newFields.push(newField);
        fieldIndex = 0;
      }
      
      if (newFields[fieldIndex]) {
        newFields[fieldIndex] = { ...newFields[fieldIndex], [property]: value };
        console.log(`Updated field:`, newFields[fieldIndex]); // Debug
        return { ...prev, [blockId]: newFields };
      }
      return prev;
    });
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

    // Initialiser les champs pour les blocs de collecte
    if (type === "ID Collection" || type === "Passport Collection") {
      const defaultFields: FieldDefinition[] = [
        {
          name: "nom",
          label: "Nom",
          field_type: "text",
          is_required: true,
          is_multiple: false,
          order: 0,
          depends_on: ""
        },
        {
          name: "prenom",
          label: "Prénom",
          field_type: "text",
          is_required: true,
          is_multiple: false,
          order: 1,
          depends_on: ""
        },
        {
          name: type === "ID Collection" ? "numero_id" : "numero_passeport",
          label: type === "ID Collection" ? "Numéro ID" : "Numéro Passeport",
          field_type: "text",
          is_required: true,
          is_multiple: false,
          order: 2,
          depends_on: ""
        }
      ];
      
      setBlockFields(prev => ({
        ...prev,
        [newId]: defaultFields
      }));
    }
  }


  // ----------------------- CRÉATION WORKFLOW IDENTITÉ -----------------------
  function createIdentityWorkflow() {
    if (!containerRef.current || !jsPlumbInstanceRef.current) return;

    const container = containerRef.current;
    const instance = jsPlumbInstanceRef.current;

    // Positions pour organiser le workflow
    const positions = {
      start: { top: 50, left: 50 },
      choice: { top: 150, left: 250 },
      idCollection: { top: 250, left: 80 },
      passportCollection: { top: 250, left: 380 },
      confirmation: { top: 350, left: 250 },
      verification: { top: 450, left: 250 },
      success: { top: 550, left: 150 },
      failed: { top: 550, left: 350 },
      end: { top: 650, left: 250 }
    };

    // Créer les blocs du workflow
    const blocks = [
      { id: "identity-start", type: "Start", pos: positions.start },
      { id: "identity-choice", type: "Identity Choice", pos: positions.choice },
      { id: "id-collection", type: "ID Collection", pos: positions.idCollection },
      { id: "passport-collection", type: "Passport Collection", pos: positions.passportCollection },
      { id: "confirmation", type: "Information Confirmation", pos: positions.confirmation },
      { id: "verification", type: "Identity Verification", pos: positions.verification },
      { id: "success", type: "Verification Success", pos: positions.success },
      { id: "failed", type: "Verification Failed", pos: positions.failed },
      { id: "identity-end", type: "End", pos: positions.end }
    ];

    // Créer chaque bloc
    blocks.forEach(block => {
      const element = document.createElement("div");
      element.id = block.id;
      
      if (block.type === "Start" || block.type === "End") {
        const colorClass = colorMap[block.type];
        element.className = `${colorClass} absolute w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold border border-black cursor-move`;
        element.textContent = block.type;
      } else {
        const colorClass = colorMap[block.type];
        // Ajuster la taille selon le type de bloc
        const isCollectionBlock = block.type === "ID Collection" || block.type === "Passport Collection";
        const blockSize = isCollectionBlock ? "w-48 h-32" : "w-44 h-28";
        element.className = `absolute ${blockSize} bg-white border border-gray-400 rounded-lg shadow-md flex flex-col overflow-hidden cursor-move`;
        
        const header = document.createElement("div");
        header.className = `${colorClass} text-white text-xs font-semibold text-center py-1 border-b border-gray-400`;
        header.textContent = block.type;

        const body = document.createElement("div");
        body.className = "flex-1 flex items-center justify-center text-xs text-gray-700 bg-white px-2 text-center";
        
        // Contenu spécifique selon le type
        switch(block.type) {
          case "Identity Choice":
            body.textContent = "Choisir: ID ou Passeport";
            break;
          case "ID Collection":
            body.innerHTML = `
              <div class="text-center">
                <div class="font-semibold mb-1">Collecter:</div>
                <div class="text-xs space-y-1">
                  <div class="field-item cursor-pointer hover:bg-gray-100 p-1 rounded" data-field="Nom">• Nom</div>
                  <div class="field-item cursor-pointer hover:bg-gray-100 p-1 rounded" data-field="Prénom">• Prénom</div>
                  <div class="field-item cursor-pointer hover:bg-gray-100 p-1 rounded" data-field="Numéro ID">• Numéro ID</div>
                </div>
              </div>
            `;
            break;
          case "Passport Collection":
            body.innerHTML = `
              <div class="text-center">
                <div class="font-semibold mb-1">Collecter:</div>
                <div class="text-xs space-y-1">
                  <div class="field-item cursor-pointer hover:bg-gray-100 p-1 rounded" data-field="Nom">• Nom</div>
                  <div class="field-item cursor-pointer hover:bg-gray-100 p-1 rounded" data-field="Prénom">• Prénom</div>
                  <div class="field-item cursor-pointer hover:bg-gray-100 p-1 rounded" data-field="Numéro Passeport">• Numéro Passeport</div>
                </div>
              </div>
            `;
            break;
          case "Information Confirmation":
            body.textContent = "Confirmer les informations saisies";
            break;
          case "Identity Verification":
            body.textContent = "Vérifier l'identité";
            break;
          case "Verification Success":
            body.textContent = "✅ Identité vérifiée";
            break;
          case "Verification Failed":
            body.textContent = "❌ Échec de vérification";
            break;
          default:
            body.textContent = "Double-clique pour éditer";
        }

        element.appendChild(header);
        element.appendChild(body);
      }

      element.style.top = `${block.pos.top}px`;
      element.style.left = `${block.pos.left}px`;

      container.appendChild(element);
      instance.manage(element);
      addEndpoints(instance, element);
    });

    // Créer les connexions
    setTimeout(() => {
      const startEl = document.getElementById("identity-start");
      const choiceEl = document.getElementById("identity-choice");
      const idCollectionEl = document.getElementById("id-collection");
      const passportCollectionEl = document.getElementById("passport-collection");
      const confirmationEl = document.getElementById("confirmation");
      const verificationEl = document.getElementById("verification");
      const successEl = document.getElementById("success");
      const failedEl = document.getElementById("failed");
      const endEl = document.getElementById("identity-end");

      if (startEl && choiceEl) instance.connect({ source: startEl, target: choiceEl });
      if (choiceEl && idCollectionEl) instance.connect({ source: choiceEl, target: idCollectionEl });
      if (choiceEl && passportCollectionEl) instance.connect({ source: choiceEl, target: passportCollectionEl });
      if (idCollectionEl && confirmationEl) instance.connect({ source: idCollectionEl, target: confirmationEl });
      if (passportCollectionEl && confirmationEl) instance.connect({ source: passportCollectionEl, target: confirmationEl });
      if (confirmationEl && verificationEl) instance.connect({ source: confirmationEl, target: verificationEl });
      if (verificationEl && successEl) instance.connect({ source: verificationEl, target: successEl });
      if (verificationEl && failedEl) instance.connect({ source: verificationEl, target: failedEl });
      if (successEl && endEl) instance.connect({ source: successEl, target: endEl });
      if (failedEl && endEl) instance.connect({ source: failedEl, target: endEl });
    }, 100);

    // Initialiser les champs pour les blocs de collecte du workflow d'identité
    const idCollectionFields: FieldDefinition[] = [
      {
        name: "nom",
        label: "Nom",
        field_type: "text",
        is_required: true,
        is_multiple: false,
        order: 0,
        depends_on: ""
      },
      {
        name: "prenom",
        label: "Prénom",
        field_type: "text",
        is_required: true,
        is_multiple: false,
        order: 1,
        depends_on: ""
      },
      {
        name: "numero_id",
        label: "Numéro ID",
        field_type: "text",
        is_required: true,
        is_multiple: false,
        order: 2,
        depends_on: ""
      }
    ];

    const passportCollectionFields: FieldDefinition[] = [
      {
        name: "nom",
        label: "Nom",
        field_type: "text",
        is_required: true,
        is_multiple: false,
        order: 0,
        depends_on: ""
      },
      {
        name: "prenom",
        label: "Prénom",
        field_type: "text",
        is_required: true,
        is_multiple: false,
        order: 1,
        depends_on: ""
      },
      {
        name: "numero_passeport",
        label: "Numéro Passeport",
        field_type: "text",
        is_required: true,
        is_multiple: false,
        order: 2,
        depends_on: ""
      }
    ];

    setBlockFields(prev => ({
      ...prev,
      "id-collection": idCollectionFields,
      "passport-collection": passportCollectionFields
    }));
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
        const blockData: any = {
          id: el.id,
          type,
          position: {
            top: Math.round(rect.top - containerRect.top),
            left: Math.round(rect.left - containerRect.left)
          },
          content: body,
        };

        // Ajouter les champs si le bloc a des champs personnalisés
        if (blockFields[el.id] && blockFields[el.id].length > 0) {
          blockData.fields = blockFields[el.id].map(field => ({
            name: field.name,
            label: field.label,
            field_type: field.field_type,
            is_required: field.is_required,
            is_multiple: field.is_multiple,
            order: field.order,
            depends_on: field.depends_on
          }));
          console.log(`Added fields to block ${el.id}:`, blockData.fields); // Debug
        }

        return blockData;
      });
  
    // 🔹 Récupération des connexions
    const connectionsData = jsPlumbInstanceRef.current.getConnections();
    const connections = Array.isArray(connectionsData) 
      ? connectionsData 
      : Object.values(connectionsData);
    const connectionsList = connections.map((conn, index) => ({
      id: `conn-${index}`,
      source: conn.sourceId,
      target: conn.targetId,
      type: "connection"
    }));
  
    const workflow = { 
      metadata: {
        name: "Identity Verification Workflow",
        version: "1.0.0",
        created_at: new Date().toISOString(),
        description: "Workflow for identity verification with customizable fields"
      },
      workflow: {
        blocks,
        connections: connectionsList
      }
    };
  
    // 🖥️ Afficher dans la console
    console.clear();
    console.log("🧱 Structure du workflow :");
    console.log(workflow);
    console.log("📜 JSON formaté :");
    console.log(JSON.stringify(workflow, null, 2));
    
    // 📊 Statistiques
    console.log("📊 Statistiques :");
    console.log(`- ${blocks.length} blocs`);
    console.log(`- ${connectionsList.length} connexions`);
    console.log(`- ${blocks.filter(b => b.fields).length} blocs avec champs personnalisés`);
    
    // 🔍 Détails des champs
    blocks.forEach(block => {
      if (block.fields && block.fields.length > 0) {
        console.log(`📝 Bloc "${block.type}" (${block.id}) :`);
        block.fields.forEach((field: FieldDefinition) => {
          console.log(`  - ${field.label} (${field.name}) - ${field.field_type} ${field.is_required ? 'requis' : 'optionnel'}`);
        });
      }
    });
  }
  
 
  // ----------------------- CRÉATION AUTOMATIQUE DE CHAMPS -----------------------
  // Supprimé pour simplifier - le modal créera les champs à la volée

  // ----------------------- MODAL D'ÉDITION DES CHAMPS -----------------------
  const renderFieldEditModal = () => {
    console.log('renderFieldEditModal called, editingField:', editingField); // Debug
    console.log('Current blockFields:', blockFields); // Debug
    
    if (!editingField) {
      console.log('No editingField, modal not rendered'); // Debug
      return null;
    }

    const blockFieldsData = blockFields[editingField.blockId] || [];
    console.log('Looking for field:', editingField.fieldName, 'in fields:', blockFieldsData); // Debug
    
    // Chercher par nom ou par label
    let fieldIndex = blockFieldsData.findIndex(field => 
      field.name === editingField.fieldName || field.label === editingField.fieldName
    );
    let currentField = fieldIndex >= 0 ? blockFieldsData[fieldIndex] : null;
    
    console.log('Found field at index:', fieldIndex, 'field:', currentField); // Debug

    // Si le champ n'existe pas, utiliser le premier champ par défaut
    if (!currentField && blockFieldsData.length > 0) {
      console.log('Field not found, using first existing field'); // Debug
      currentField = blockFieldsData[0];
      fieldIndex = 0;
    } else if (!currentField) {
      console.log('No fields available, creating default'); // Debug
      currentField = {
        name: editingField.fieldName.toLowerCase().replace(/\s+/g, '_'),
        label: editingField.fieldName,
        field_type: "text",
        is_required: false,
        is_multiple: false,
        order: 0,
        depends_on: ""
      };
      fieldIndex = -1; // Indique que c'est un nouveau champ
    } else {
      console.log('Found existing field, will modify it'); // Debug
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Éditer le champ: {currentField.label}</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du champ</label>
              <input
                type="text"
                defaultValue={currentField.name}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="nom_du_champ"
                onChange={(e) => updateFieldProperty(editingField.blockId, fieldIndex, 'name', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label affiché</label>
              <input
                type="text"
                defaultValue={currentField.label}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Label affiché"
                onChange={(e) => updateFieldProperty(editingField.blockId, fieldIndex, 'label', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de champ</label>
              <select
                defaultValue={currentField.field_type}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                onChange={(e) => updateFieldProperty(editingField.blockId, fieldIndex, 'field_type', e.target.value)}
              >
                <option value="text">Texte</option>
                <option value="number">Nombre</option>
                <option value="email">Email</option>
                <option value="date">Date</option>
                <option value="select">Sélection</option>
                <option value="checkbox">Case à cocher</option>
                <option value="textarea">Zone de texte</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ordre</label>
              <input
                type="number"
                defaultValue={currentField.order}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                onChange={(e) => updateFieldProperty(editingField.blockId, fieldIndex, 'order', parseInt(e.target.value) || 0)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dépend de</label>
              <input
                type="text"
                defaultValue={currentField.depends_on}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Nom du champ dont dépend ce champ"
                onChange={(e) => updateFieldProperty(editingField.blockId, fieldIndex, 'depends_on', e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex space-x-4 mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                defaultChecked={currentField.is_required}
                className="mr-2"
                onChange={(e) => updateFieldProperty(editingField.blockId, fieldIndex, 'is_required', e.target.checked)}
              />
              <span className="text-sm text-gray-700">Requis</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                defaultChecked={currentField.is_multiple}
                className="mr-2"
                onChange={(e) => updateFieldProperty(editingField.blockId, fieldIndex, 'is_multiple', e.target.checked)}
              />
              <span className="text-sm text-gray-700">Multiple</span>
            </label>
          </div>
          
          <div className="flex justify-end space-x-2 mt-6">
            <button
              onClick={handleFieldCancel}
              className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                // Synchroniser l'affichage du bloc
                syncFieldDisplay(editingField.blockId);
                handleFieldCancel();
              }}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    );
  };
 
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
          <button
            onClick={createIdentityWorkflow}
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold py-1 rounded"
          >
            🆔 Créer Workflow Identité
          </button>
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
        {/* Zone vide - l'utilisateur peut glisser-déposer des blocs depuis le menu latéral */}
      </div>
      
      {/* MODAL D'ÉDITION DES CHAMPS */}
      {renderFieldEditModal()}
    </div>
  );
}
