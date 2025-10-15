import React, { useState, useEffect } from 'react';
import { FieldDefinition, EditingBlock } from './types';
import { Edit, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';

interface BlockEditModalProps {
  showModal: boolean;
  editingBlock: EditingBlock | null;
  blockFields: Record<string, FieldDefinition[]>;
  editingFieldIndex: number | null;
  setEditingFieldIndex: (index: number | null) => void;
  updateFieldProperty: (blockId: string, fieldIndex: number, property: keyof FieldDefinition, value: any) => void;
  setBlockFields: React.Dispatch<React.SetStateAction<Record<string, FieldDefinition[]>>>;
  onClose: () => void;
  syncFieldDisplay: (blockId: string, forceUpdate?: boolean) => void;
}

export const BlockEditModal: React.FC<BlockEditModalProps> = ({
  showModal,
  editingBlock,
  blockFields,
  editingFieldIndex,
  setEditingFieldIndex,
  updateFieldProperty,
  setBlockFields,
  onClose,
  syncFieldDisplay
}) => {
  // États locaux pour éviter la perte de focus
  const [localFieldData, setLocalFieldData] = useState<FieldDefinition | null>(null);

  const blockFieldsData = blockFields[editingBlock?.blockId || ''] || [];
  const isCollectionBlock = editingBlock?.blockType === "ID Collection" || editingBlock?.blockType === "Passport Collection";
  

  // Initialiser les données locales quand on entre en mode édition
  useEffect(() => {
    if (editingFieldIndex !== null && blockFieldsData[editingFieldIndex]) {
      setLocalFieldData({ ...blockFieldsData[editingFieldIndex] });
    } else {
      setLocalFieldData(null);
    }
  }, [editingFieldIndex, blockFieldsData]);

  if (!editingBlock) return null;

  return (
    <Sheet open={showModal} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-1/2 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{editingBlock.blockType}</SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto py-6">
          <div className="space-y-6">
            {/* Configuration générale du bloc */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-700 mb-4">Configuration du bloc</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre du bloc</label>
                  <input
                    type="text"
                    defaultValue={editingBlock.blockType}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    onChange={(e) => {
                      // Mettre à jour le titre dans le DOM
                      const blockElement = document.getElementById(editingBlock.blockId);
                      if (blockElement) {
                        const headerElement = blockElement.querySelector('div:first-child');
                        if (headerElement) {
                          headerElement.textContent = e.target.value;
                        }
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contenu du bloc</label>
                  <input
                    type="text"
                    defaultValue={(() => {
                      const blockElement = document.getElementById(editingBlock.blockId);
                      const bodyElement = blockElement?.querySelector('div:last-child');
                      return bodyElement?.textContent?.trim() || '';
                    })()}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    onChange={(e) => {
                      // Mettre à jour le contenu dans le DOM
                      const blockElement = document.getElementById(editingBlock.blockId);
                      if (blockElement) {
                        const bodyElement = blockElement.querySelector('div:last-child');
                        if (bodyElement) {
                          bodyElement.textContent = e.target.value;
                        }
                      }
                    }}
                  />
                </div>
              </div>
              
            </div>




            {/* Liste des champs existants - seulement pour les blocs de collecte */}
            {isCollectionBlock && (
              <>
                {blockFieldsData.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700">Champs configurés:</h4>
                    {blockFieldsData
                      .sort((a, b) => a.order - b.order)
                      .map((field, index) => (
                        <div key={field.name} className="border border-gray-200 rounded-lg p-4">
                          {editingFieldIndex === index && localFieldData ? (
                            // Mode édition avec données locales
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom du champ</label>
                                  <input
                                    type="text"
                                    value={localFieldData.name}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    onChange={(e) => setLocalFieldData(prev => prev ? { ...prev, name: e.target.value } : null)}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Label affiché</label>
                                  <input
                                    type="text"
                                    value={localFieldData.label}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    onChange={(e) => setLocalFieldData(prev => prev ? { ...prev, label: e.target.value } : null)}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Type de champ</label>
                                  <select
                                    value={localFieldData.field_type}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    onChange={(e) => setLocalFieldData(prev => prev ? { ...prev, field_type: e.target.value } : null)}
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
                                    value={localFieldData.order}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    onChange={(e) => setLocalFieldData(prev => prev ? { ...prev, order: parseInt(e.target.value) || 0 } : null)}
                                  />
                                </div>
                              </div>
                              
                              <div className="flex space-x-4">
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={localFieldData.is_required}
                                    className="mr-2"
                                    onChange={(e) => setLocalFieldData(prev => prev ? { ...prev, is_required: e.target.checked } : null)}
                                  />
                                  <span className="text-sm text-gray-700">Requis</span>
                                </label>
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={localFieldData.is_multiple}
                                    className="mr-2"
                                    onChange={(e) => setLocalFieldData(prev => prev ? { ...prev, is_multiple: e.target.checked } : null)}
                                  />
                                  <span className="text-sm text-gray-700">Multiple</span>
                                </label>
                              </div>
                              
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => {
                                    setEditingFieldIndex(null);
                                    setLocalFieldData(null);
                                  }}
                                  className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                                >
                                  Annuler
                                </button>
                                <button
                                  onClick={() => {
                                    if (localFieldData) {
                                      // Appliquer tous les changements en une seule fois
                                      Object.keys(localFieldData).forEach(key => {
                                        updateFieldProperty(editingBlock.blockId, index, key as keyof FieldDefinition, localFieldData[key as keyof FieldDefinition]);
                                      });
                                    }
                                    setEditingFieldIndex(null);
                                    setLocalFieldData(null);
                                    setTimeout(() => syncFieldDisplay(editingBlock.blockId, true), 50);
                                  }}
                                  className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                  Sauvegarder
                                </button>
                              </div>
                            </div>
                          ) : (
                            // Mode affichage
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h5 className="font-medium text-gray-800">{field.label}</h5>
                                  <p className="text-xs text-gray-500">Type: {field.field_type} | Ordre: {field.order}</p>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => setEditingFieldIndex(index)}
                                    className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition-colors"
                                    title="Éditer le champ"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Êtes-vous sûr de vouloir supprimer le champ "${field.label}" ?`)) {
                                        setBlockFields(prev => {
                                          const currentFields = prev[editingBlock.blockId] || [];
                                          const newFields = currentFields.filter((_, i) => i !== index);
                                          return {
                                            ...prev,
                                            [editingBlock.blockId]: newFields
                                          };
                                        });
                                        setTimeout(() => syncFieldDisplay(editingBlock.blockId, true), 50);
                                      }
                                    }}
                                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                                    title="Supprimer le champ"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                              
                              <div className="text-xs text-gray-600 space-y-1">
                                <div>Requis: {field.is_required ? 'Oui' : 'Non'}</div>
                                <div>Multiple: {field.is_multiple ? 'Oui' : 'Non'}</div>
                                {field.depends_on && <div>Dépend de: {field.depends_on}</div>}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
                
                {/* Bouton pour ajouter un nouveau champ - toujours visible pour les blocs de collecte */}
                <div className="border-t border-gray-200 pt-4">
                  <button
                    onClick={() => {
                      const newField: FieldDefinition = {
                        name: `nouveau_champ_${Date.now()}`,
                        label: "Nouveau Champ",
                        field_type: "text",
                        is_required: false,
                        is_multiple: false,
                        order: blockFieldsData.length,
                        depends_on: ""
                      };
                      
                      setBlockFields(prev => ({
                        ...prev,
                        [editingBlock.blockId]: [...(prev[editingBlock.blockId] || []), newField]
                      }));
                    }}
                    className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700"
                  >
                    + Ajouter un nouveau champ
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
        
        <SheetFooter className="flex justify-end">
          <button
            onClick={() => {
              // Synchroniser l'affichage du bloc
              setTimeout(() => syncFieldDisplay(editingBlock.blockId, true), 50);
              // Fermer la modale
              onClose();
            }}
            className="py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
          >
            Enregistrer
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

