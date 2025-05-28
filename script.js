// Register the dagre layout for Cytoscape.js
cytoscape.use(cytoscapeDagre);

let cy; // Variable to hold our Cytoscape.js instance
let currentMode = 'influence'; // 'influence' or 'decisionTree'

// --- Influence Diagram Data & Management ---
let infNodes = []; // Stores node data for influence diagram
let infInfluences = []; // Stores edge data for influence diagram

// --- Decision Tree Data & Management ---
let dtRootNode = null; // The root of the decision tree (Cytoscape node data)
let currentDtFocusNode = null; // The node currently being edited/added children to (Cytoscape node data)
let dtElements = []; // All Cytoscape elements (nodes and edges) for the decision tree

// --- UI Element References ---
const influenceControls = document.getElementById('influenceControls');
const decisionTreeControls = document.getElementById('decisionTreeControls');
const influenceModeBtn = document.getElementById('influenceModeBtn');
const decisionTreeModeBtn = document.getElementById('decisionTreeModeBtn');

// Influence Diagram UI elements
const infNodeNameInput = document.getElementById('infNodeNameInput');
const infNodeTypeSelect = document.getElementById('infNodeTypeSelect');
const addInfNodeBtn = document.getElementById('addInfNodeBtn');
const infNodeList = document.getElementById('infNodeList');
const sourceNodeSelect = document.getElementById('sourceNodeSelect');
const targetNodeSelect = document.getElementById('targetNodeSelect');
const addInfluenceBtn = document.getElementById('addInfluenceBtn');
const influenceList = document.getElementById('influenceList');
const applyInfLayoutBtn = document.getElementById('applyInfLayoutBtn');
const exportInfImageBtn = document.getElementById('exportInfImageBtn');
const deleteInfNodeBtn = document.getElementById('deleteInfNodeBtn'); // NEW: Delete button ref
const clearInfDiagramBtn = document.getElementById('clearInfDiagramBtn');

// Decision Tree UI elements
const currentFocusNodeSpan = document.getElementById('currentFocusNode');
const goToRootBtn = document.getElementById('goToRootBtn');
const goToParentBtn = document.getElementById('goToParentBtn');
const dtChildNameInput = document.getElementById('dtChildNameInput');
const dtProbabilityInput = document.getElementById('dtProbabilityInput');
const dtValueInput = document.getElementById('dtValueInput');
const dtChildTypeSelect = document.getElementById('dtChildTypeSelect');
const addDtChildBtn = document.getElementById('addDtChildBtn');
const probabilitySumSpan = document.getElementById('probabilitySum');
const applyDtLayoutBtn = document.getElementById('applyDtLayoutBtn');
const exportDtImageBtn = document.getElementById('exportDtImageBtn');
const deleteDtNodeBtn = document.getElementById('deleteDtNodeBtn'); // NEW: Delete button ref
const clearDtDiagramBtn = document.getElementById('clearDtDiagramBtn');
const dtTreeStructureList = document.getElementById('dtTreeStructureList');

// --- Core Cytoscape Initialization ---
function initializeCytoscape() {
    if (cy) {
        cy.destroy(); // Destroy existing instance if any
    }

    cy = cytoscape({
        container: document.getElementById('cy'), // container to render in
        elements: [], // start with empty elements

        style: [ // the stylesheet for the graph
            {
                selector: 'node',
                style: {
                    'background-color': 'data(color)',
                    'label': 'data(label)', // Use 'label' for display
                    'text-valign': 'center',
                    'color': '#333',
                    'font-family': 'Arial, sans-serif', // Default font
                    'font-size': '12px',
                    'padding': '10px',
                    'border-width': '1px',
                    'border-color': '#bbb',
                    'shape': 'data(shape)',
                    'text-wrap': 'wrap', // Allow text wrapping for long labels
                    'text-max-width': '100px' // Max width for text
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': '#999',
                    'target-arrow-color': '#999',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier', // 'bezier' or 'taxi' for cleaner lines
                    'label': 'data(label)', // Label on edge for decision tree branches
                    'font-size': '10px',
                    'text-background-opacity': 1,
                    'text-background-color': '#fff',
                    'text-background-padding': '3px',
                    'color': '#555',
                    'font-family': 'Arial, sans-serif' // Default font
                }
            },
            {
                selector: ':selected',
                style: {
                    'border-color': '#007bff',
                    'border-width': '3px',
                    'opacity': 0.8
                }
            },
            // Specific styles for Decision Tree nodes
            {
                selector: '.decision-node', // Decision Point (Square)
                style: {
                    'shape': 'rectangle',
                    'background-color': '#ADD8E6' // Light Blue
                }
            },
            {
                selector: '.chance-node', // Uncertainty/Chance Point (Circle)
                style: {
                    'shape': 'ellipse',
                    'background-color': '#90EE90' // Light Green
                }
            },
            {
                selector: '.terminal-node', // Result/Terminal Point (Diamond)
                style: {
                    'shape': 'diamond',
                    'background-color': '#FFB6C1' // Light Pink
                }
            },
            {
                selector: '.selected-focus', // Style for the currently focused node in DT
                style: {
                    'border-color': '#f0ad4e', /* Orange highlight */
                    'border-width': '3px',
                    'box-shadow': '0 0 8px rgba(240, 173, 78, 0.6)'
                }
            }
        ],
        layout: {
            name: 'preset' // Default to preset, then apply specific layout
        }
    });

    // Handle node clicks for decision tree focus
    cy.on('tap', 'node', function(evt){
        if (currentMode === 'decisionTree') {
            const nodeData = evt.target.data();
            // In decision tree, a "branch" is an edge, not a node.
            // So, we only allow focusing on actual decision, chance, or terminal nodes.
            // The `dtChildTypeSelect` logic has been updated to reflect adding a NODE.
            if (nodeData.type !== 'branch') { // This check should always be true for tap-able nodes
                currentDtFocusNode = nodeData; // Store the full data object
                updateDtFocusNodeDisplay();
                updateDtChildTypeOptions(); // Update options based on new focus
                updateProbabilitySumDisplay();
                updateDtTreeStructureList(); // Update list to highlight focus

                // Highlight the selected node visually
                cy.elements().removeClass('selected-focus');
                evt.target.addClass('selected-focus');
            }
        }
    });
}

// --- Mode Switching Logic ---
function switchMode(mode) {
    currentMode = mode;
    if (mode === 'influence') {
        influenceControls.classList.remove('hidden');
        decisionTreeControls.classList.add('hidden');
        influenceModeBtn.classList.add('active');
        decisionTreeModeBtn.classList.remove('active');
        loadInfluenceDiagram();
    } else { // decisionTree mode
        influenceControls.classList.add('hidden');
        decisionTreeControls.classList.remove('hidden');
        influenceModeBtn.classList.remove('active');
        decisionTreeModeBtn.classList.add('active');
        loadDecisionTreeDiagram();
    }
}

// --- Influence Diagram Specific Functions ---
function updateInfNodeSelects() {
    const sourceSelect = document.getElementById('sourceNodeSelect');
    const targetSelect = document.getElementById('targetNodeSelect');

    sourceSelect.innerHTML = '<option value="">-- 选择源节点 --</option>';
    targetSelect.innerHTML = '<option value="">-- 选择目标节点 --</option>';

    infNodes.forEach(node => {
        const option1 = document.createElement('option');
        option1.value = node.id;
        option1.textContent = node.id;
        sourceSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = node.id;
        option2.textContent = node.id;
        targetSelect.appendChild(option2);
    });
    // Reset selected values if current selections are no longer valid
    if (!infNodes.some(n => n.id === sourceSelect.value)) sourceSelect.value = "";
    if (!infNodes.some(n => n.id === targetSelect.value)) targetSelect.value = "";
}

function updateInfNodeListDisplay() {
    infNodeList.innerHTML = '';
    infNodes.forEach(node => {
        const listItem = document.createElement('li');
        listItem.textContent = `${node.id} (${node.type})`;
        infNodeList.appendChild(listItem);
    });
}

function updateInfluenceListDisplay() {
    influenceList.innerHTML = '';
    infInfluences.forEach(edge => {
        const listItem = document.createElement('li');
        listItem.textContent = `${edge.data.source} → ${edge.data.target}`;
        influenceList.appendChild(listItem);
    });
}

function loadInfluenceDiagram() {
    cy.elements().remove(); // Clear current graph
    cy.add(infNodes.map(n => ({group: 'nodes', data: n}))); // Add nodes
    cy.add(infInfluences); // Add edges
    applyInfLayout();
}

function applyInfLayout() {
    cy.layout({
        name: 'dagre',
        rankDir: 'LR', // Left to Right
        nodeSep: 70,    // Space between nodes
        rankSep: 100,   // Space between ranks (layers)
        padding: 30
    }).run();
}

// --- Decision Tree Specific Functions ---
function updateDtFocusNodeDisplay() {
    currentFocusNodeSpan.textContent = currentDtFocusNode ? currentDtFocusNode.label : "根节点";
    goToParentBtn.disabled = !currentDtFocusNode || (dtRootNode && currentDtFocusNode.id === dtRootNode.id);
    goToRootBtn.disabled = !dtRootNode || (dtRootNode && currentDtFocusNode.id === dtRootNode.id);
}

function updateDtChildTypeOptions() {
    dtProbabilityInput.classList.add('hidden');
    dtValueInput.classList.add('hidden');
    dtChildTypeSelect.value = ""; // Reset selection

    const options = dtChildTypeSelect.options;
    // Clear existing options except the first placeholder
    while (options.length > 0) { // Clear all options
        options[0].remove();
    }
    options.add(new Option("-- 选择类型 --", "")); // Add placeholder

    if (!currentDtFocusNode) { // Adding the root node
        options.add(new Option("决策点", "decision"));
    } else if (currentDtFocusNode.type === 'terminal') {
        // Terminal nodes cannot have children
        // No options to add
    } else { // Decision or Chance node can add other nodes
        options.add(new Option("决策点", "decision"));
        options.add(new Option("不确定事件点", "chance"));
        options.add(new Option("结果点", "terminal"));
    }

    // Event listener for type change to show/hide probability/value inputs
    dtChildTypeSelect.onchange = () => {
        dtProbabilityInput.classList.add('hidden');
        dtValueInput.classList.add('hidden');
        // If parent is a chance node, probability input is needed for the branch
        if (currentDtFocusNode && currentDtFocusNode.type === 'chance' && dtChildTypeSelect.value !== '') {
            dtProbabilityInput.classList.remove('hidden');
        } 
        // If the new child node type is 'terminal', value input is needed
        if (dtChildTypeSelect.value === 'terminal') {
            dtValueInput.classList.remove('hidden');
        }
    };
}

function updateProbabilitySumDisplay() {
    if (currentDtFocusNode && currentDtFocusNode.type === 'chance') {
        let sum = 0;
        // Iterate through edges originating from the current chance node in dtElements (our data model)
        dtElements.forEach(el => {
            if (el.group === 'edges' && el.data.source === currentDtFocusNode.id && el.data.probability !== undefined) {
                sum += parseFloat(el.data.probability);
            }
        });
        probabilitySumSpan.textContent = `概率总和: ${sum.toFixed(2)}`;
        probabilitySumSpan.style.color = Math.abs(sum - 1) < 0.001 ? 'green' : 'red';
    } else {
        probabilitySumSpan.textContent = '';
        probabilitySumSpan.style.color = 'black';
    }
}

function updateDtTreeStructureList() {
    if (dtRootNode) {
        dtTreeStructureList.innerHTML = '';
    }

    // Helper function to recursively add nodes/branches to the list
    function addToList(nodeId, indent = 0) {
        const node = cy.getElementById(nodeId).data();
        if (!node) return;

        const li = document.createElement('li');
        let prefix = '  '.repeat(indent);
        let nodeLabel = node.label;

        if (node.type === 'terminal' && node.value !== undefined) {
            nodeLabel += ` (价值: ${node.value})`;
        }

        li.textContent = `${prefix}${nodeLabel} [${node.type}]`;

        // Highlight current focus node in the list
        if (currentDtFocusNode && node.id === currentDtFocusNode.id) {
            li.style.fontWeight = 'bold';
            li.style.backgroundColor = '#e0e0e0';
        }

        dtTreeStructureList.appendChild(li);

        // Find outgoing branch edges from this node
        cy.edges().forEach(edge => {
            if (edge.source().id() === nodeId && edge.data('type') === 'branch') {
                const branchLabel = edge.data('label');
                const branchLi = document.createElement('li');
                branchLi.textContent = `${'  '.repeat(indent + 1)}分支: ${branchLabel}`;
                dtTreeStructureList.appendChild(branchLi);
                // Recursively add the node at the end of this branch
                addToList(edge.target().id(), indent + 2);
            }
        });
    }

    if (dtRootNode) {
        addToList(dtRootNode.id);
    }
}


function loadDecisionTreeDiagram() {
    cy.elements().remove(); // Clear current graph
    cy.add(dtElements); // Add all stored DT elements
    applyDtLayout();
    // Re-apply focus highlight if a node is focused
    cy.elements().removeClass('selected-focus');
    if (currentDtFocusNode) {
        const focusCyNode = cy.getElementById(currentDtFocusNode.id);
        if (focusCyNode) {
            focusCyNode.addClass('selected-focus');
        }
    }
    updateDtTreeStructureList(); // Ensure list is updated on load
}

function applyDtLayout() {
    cy.layout({
        name: 'dagre',
        rankDir: 'LR', // Left to Right
        nodeSep: 50,  // Space between nodes in the same rank
        rankSep: 120, // Space between ranks (layers)
        padding: 30,
        fit: true // Fit the graph to the viewport
    }).run();
}


// --- Event Listeners ---

// Mode Switching
influenceModeBtn.addEventListener('click', () => switchMode('influence'));
decisionTreeModeBtn.addEventListener('click', () => switchMode('decisionTree'));

// --- Influence Diagram Event Listeners ---
addInfNodeBtn.addEventListener('click', () => {
    const nodeName = infNodeNameInput.value.trim();
    const nodeType = infNodeTypeSelect.value;

    if (!nodeName) { alert('请输入节点名称。'); return; }
    if (infNodes.some(node => node.id === nodeName)) { alert(`节点 "${nodeName}" 已经存在。`); return; }

    let shape, color;
    switch (nodeType) {
        case 'decision': shape = 'roundrectangle'; color = 'lightblue'; break;
        case 'uncertainty': shape = 'ellipse'; color = 'lightgreen'; break;
        case 'value': shape = 'diamond'; color = 'lightcoral'; break;
        default: shape = 'rectangle'; color = 'lightgray';
    }

    const newNode = {
        id: nodeName,
        type: nodeType,
        label: nodeName, // For Cytoscape display
        shape: shape,
        color: color
    };
    infNodes.push(newNode); // Store data in our array
    
    // Add to Cytoscape directly
    cy.add({group: 'nodes', data: newNode});
    
    infNodeNameInput.value = ''; // Clear input
    updateInfNodeSelects(); // Update dropdowns
    updateInfNodeListDisplay(); // Update list display
    applyInfLayout(); // Apply layout
});

addInfluenceBtn.addEventListener('click', () => {
    const sourceNodeId = sourceNodeSelect.value;
    const targetNodeId = targetSelect.value;

    if (!sourceNodeId || !targetNodeId) { alert('请选择源节点和目标节点。'); return; }
    if (sourceNodeId === targetNodeId) { alert('源节点和目标节点不能相同。'); return; }

    const edgeId = `${sourceNodeId}-${targetNodeId}`;
    if (infInfluences.some(edge => edge.data.id === edgeId)) { alert(`影响关系 "${sourceNodeId} → ${targetNodeId}" 已经存在。`); return; }

    const newInfluence = {
        group: 'edges',
        data: { id: edgeId, source: sourceNodeId, target: targetNodeId }
    };
    infInfluences.push(newInfluence); // Store data in our array

    // Add to Cytoscape directly
    cy.add(newInfluence);
    
    updateInfluenceListDisplay(); // Update list display
    applyInfLayout(); // Apply layout
});

applyInfLayoutBtn.addEventListener('click', () => applyInfLayout());

exportInfImageBtn.addEventListener('click', () => {
    const png64 = cy.png({ full: true, scale: 2 }); // Scale up for higher resolution
    const downloadLink = document.createElement('a');
    downloadLink.href = png64;
    downloadLink.download = 'influence_diagram.png';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
});

// NEW: Delete selected node for Influence Diagram
deleteInfNodeBtn.addEventListener('click', () => {
    const selected = cy.$(':selected');
    if (selected.empty()) {
        alert('请选择一个节点进行删除。');
        return;
    }

    if (selected.length > 1) {
        alert('请一次只选择一个节点进行删除。');
        return;
    }

    const nodeToDelete = selected[0]; // Get the selected node element
    const nodeIdToDelete = nodeToDelete.id();
    const nodeLabel = nodeToDelete.data('label');

    if (!confirm(`确定要删除节点 "${nodeLabel}" 及其所有关联的影响关系吗？`)) {
        return;
    }

    // 1. Remove from Cytoscape.js (this automatically removes connected edges)
    cy.remove(nodeToDelete);

    // 2. Update internal data structures
    // Remove node from infNodes array
    infNodes = infNodes.filter(node => node.id !== nodeIdToDelete);

    // Remove influences (edges) connected to this node from infInfluences array
    // This part is crucial as cy.remove() only updates the visual graph, not our data model.
    infInfluences = infInfluences.filter(edge => edge.data.source !== nodeIdToDelete && edge.data.target !== nodeIdToDelete);

    // 3. Update UI displays
    updateInfNodeSelects();
    updateInfNodeListDisplay();
    updateInfluenceListDisplay();
    // applyInfLayout(); // Optional: re-layout if desired, but might cause shifts

    alert(`节点 "${nodeLabel}" 已删除。`);
});


clearInfDiagramBtn.addEventListener('click', () => {
    if (confirm('确定要清空所有影响图数据吗？此操作无法撤销。')) {
        infNodes = [];
        infInfluences = [];
        initializeCytoscape(); // Re-initialize Cytoscape instance
        updateInfNodeSelects();
        updateInfNodeListDisplay();
        updateInfluenceListDisplay();
        // Stay in influence mode, no need to call switchMode
    }
});


// --- Decision Tree Event Listeners ---
goToRootBtn.addEventListener('click', () => {
    if (dtRootNode) {
        currentDtFocusNode = dtRootNode;
        updateDtFocusNodeDisplay();
        updateDtChildTypeOptions();
        updateProbabilitySumDisplay();
        updateDtTreeStructureList(); // Update list to highlight focus

        cy.elements().removeClass('selected-focus');
        const focusCyNode = cy.getElementById(dtRootNode.id);
        if (focusCyNode) focusCyNode.addClass('selected-focus');
    }
});

goToParentBtn.addEventListener('click', () => {
    if (currentDtFocusNode && dtRootNode && currentDtFocusNode.id !== dtRootNode.id) {
        // Find the edge that points to currentDtFocusNode
        const incomingEdge = cy.edges().filter(edge => edge.target().id() === currentDtFocusNode.id && edge.data('type') === 'branch');
        if (incomingEdge.length > 0) {
            const parentNodeId = incomingEdge[0].source().id();
            currentDtFocusNode = cy.getElementById(parentNodeId).data();
            updateDtFocusNodeDisplay();
            updateDtChildTypeOptions();
            updateProbabilitySumDisplay();
            updateDtTreeStructureList(); // Update list to highlight focus

            cy.elements().removeClass('selected-focus');
            const focusCyNode = cy.getElementById(currentDtFocusNode.id);
            if (focusCyNode) focusCyNode.addClass('selected-focus');
        }
    } else { // Already at root or no root
        currentDtFocusNode = dtRootNode; // Go to root if no specific parent or already at root
        updateDtFocusNodeDisplay();
        updateDtChildTypeOptions();
        updateProbabilitySumDisplay();
        updateDtTreeStructureList(); // Update list to highlight focus

        cy.elements().removeClass('selected-focus');
        if (dtRootNode) cy.getElementById(dtRootNode.id).addClass('selected-focus');
    }
});


addDtChildBtn.addEventListener('click', () => {
    const childName = dtChildNameInput.value.trim();
    const childType = dtChildTypeSelect.value; // This is now the TYPE OF THE NEW NODE

    if (!childName) { alert('请输入名称。'); return; }
    if (!childType) { alert('请选择类型。'); return; }

    const newId = `node-${Date.now()}`; // Unique ID for new node

    if (!currentDtFocusNode) { // Adding the root node
        if (childType !== 'decision') {
            alert('决策树的根节点必须是“决策点”。');
            return;
        }
        dtRootNode = { id: newId, label: childName, type: 'decision', classes: 'decision-node' };
        dtElements.push({ group: 'nodes', data: dtRootNode, classes: dtRootNode.classes });
        currentDtFocusNode = dtRootNode; // Set focus to the new root
    } else { // Adding a child node to an existing focus node
        const parentId = currentDtFocusNode.id;
        let branchLabel = childName; // Default branch label based on child name

        // Handle specific validations based on parent type
        if (currentDtFocusNode.type === 'terminal') {
            alert('结果点不能添加子节点。');
            return;
        }

        let probability;
        let value;

        // If parent is a chance node, process probability
        if (currentDtFocusNode.type === 'chance') {
            probability = parseFloat(dtProbabilityInput.value);
            if (isNaN(probability) || probability < 0 || probability > 1) {
                alert('请为不确定性分支输入有效的概率 (0-1)。');
                return;
            }
            // Check probability sum
            let currentSum = 0;
            // Iterate through edges originating from the current chance node in dtElements (our data model)
            dtElements.forEach(el => {
                if (el.group === 'edges' && el.data.source === parentId && el.data.probability !== undefined) {
                    currentSum += parseFloat(el.data.probability);
                }
            });

            if (currentSum + probability > 1.001) { // Allow for tiny floating point errors
                 alert(`警告: 概率总和将超过 1 (${(currentSum + probability).toFixed(2)})。请调整。`);
                 return;
            }
            // Update branchLabel to include probability
            branchLabel = `${childName} (p=${probability.toFixed(2)})`;
        }

        // If the new child is a terminal node, process value
        if (childType === 'terminal') {
            value = parseFloat(dtValueInput.value);
            if (isNaN(value)) {
                alert('结果点需要输入价值。');
                return;
            }
            // If it's a terminal node AND a child of a chance node, combine labels.
            if (currentDtFocusNode.type === 'chance') {
                // Combine probability from parent branch and value for terminal node
                branchLabel = `${childName} (p=${probability !== undefined ? probability.toFixed(2) : 'N/A'}, 价值: ${value})`;
            } else {
                // If it's a terminal node child of a decision node, just show value
                branchLabel = `${childName} (价值: ${value})`;
            }
        }
        
        // --- 提醒：当父节点是不确定性事件点，子节点是结果点时，请确保同时填写概率和价值。---

        // Create the new child node data
        const newChildNodeData = { id: newId, label: childName, type: childType };
        let nodeClasses = '';
        if (childType === 'decision') {
            nodeClasses = 'decision-node';
        } else if (childType === 'chance') {
            nodeClasses = 'chance-node';
        } else if (childType === 'terminal') {
            nodeClasses = 'terminal-node';
            newChildNodeData.value = value; // Store value in node data
        }

        // Add the new node to dtElements
        dtElements.push({ group: 'nodes', data: newChildNodeData, classes: nodeClasses });

        // Create the edge (branch) connecting parent to new child
        const branchEdgeId = `edge-${parentId}-${newId}`;
        // Check if this specific edge already exists (e.g., if re-adding same branch)
        if (dtElements.some(el => el.group === 'edges' && el.data.id === branchEdgeId)) {
            alert(`从 ${currentDtFocusNode.label} 到 ${childName} 的分支已经存在。`);
            return;
        }

        const branchEdge = {
            group: 'edges',
            data: {
                id: branchEdgeId,
                source: parentId,
                target: newId,
                label: branchLabel, // Label on the edge
                type: 'branch', // Custom type for edge classification
                probability: (currentDtFocusNode.type === 'chance' ? probability : undefined) // Store probability on edge
            },
            classes: 'dt-branch-edge'
        };
        dtElements.push(branchEdge);

        currentDtFocusNode = newChildNodeData; // Set focus to the newly added child node
    }

    // Clear inputs and hide specific fields
    dtChildNameInput.value = '';
    dtProbabilityInput.value = '';
    dtValueInput.value = '';
    dtChildTypeSelect.value = ''; // Reset select
    // Explicitly call updateDtChildTypeOptions to correctly hide inputs after clearing
    updateDtChildTypeOptions(); 

    loadDecisionTreeDiagram(); // Reload to reflect changes
    updateDtFocusNodeDisplay(); // Update focus display
    // updateDtChildTypeOptions(); // Already called by previous line
    updateProbabilitySumDisplay(); // Update probability sum for new focus
    updateDtTreeStructureList(); // Update the text list

    // Highlight the new focus node
    cy.elements().removeClass('selected-focus');
    if (currentDtFocusNode) {
        const focusCyNode = cy.getElementById(currentDtFocusNode.id);
        if (focusCyNode) {
            focusCyNode.addClass('selected-focus');
        }
    }
});

applyDtLayoutBtn.addEventListener('click', () => applyDtLayout());

exportDtImageBtn.addEventListener('click', () => {
    const png64 = cy.png({ full: true, scale: 2 }); // Scale up for higher resolution
    const downloadLink = document.createElement('a');
    downloadLink.href = png64;
    downloadLink.download = 'decision_tree.png';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
});

// NEW: Delete selected node for Decision Tree
deleteDtNodeBtn.addEventListener('click', () => {
    const selected = cy.$(':selected');
    if (selected.empty()) {
        alert('请选择一个节点进行删除。');
        return;
    }

    if (selected.length > 1) {
        alert('请一次只选择一个节点进行删除。');
        return;
    }

    const nodeToDelete = selected[0]; // Get the selected node element
    const nodeIdToDelete = nodeToDelete.id();
    const nodeLabel = nodeToDelete.data('label');

    if (!confirm(`确定要删除节点 "${nodeLabel}" 及其所有关联的分支和子树吗？此操作无法撤销。`)) {
        return;
    }

    // If deleting the root node
    if (dtRootNode && nodeIdToDelete === dtRootNode.id) {
        dtRootNode = null;
        currentDtFocusNode = null;
        dtElements = []; // Clear all elements
        cy.elements().remove(); // Clear Cytoscape graph
        alert(`根节点 "${nodeLabel}" 已删除。`);
        // Update all UI elements
        updateDtFocusNodeDisplay();
        updateDtChildTypeOptions();
        updateProbabilitySumDisplay();
        updateDtTreeStructureList();
        return;
    }

    // For non-root nodes:
    // Get all elements (nodes and edges) in the subtree rooted at nodeToDelete
    const subtreeElements = nodeToDelete.add(nodeToDelete.successors()); // Includes the node itself and all its descendants (nodes and edges)

    // Collect IDs of elements to be removed from dtElements array
    const removedIds = new Set(subtreeElements.map(ele => ele.id()));
    
    // Also explicitly find and collect incoming edges to the nodeToDelete itself
    // .incomers('edge') gets all incoming edges. Filter by type 'branch' for DT specific edges.
    const incomingEdgesToDeletedNode = nodeToDelete.incomers('edge[type="branch"]');
    incomingEdgesToDeletedNode.forEach(edge => removedIds.add(edge.id()));

    // Remove elements from Cytoscape.js
    cy.remove(subtreeElements); // Removes subtree and its connected outgoing edges
    cy.remove(incomingEdgesToDeletedNode); // Explicitly remove incoming edges

    // Update internal dtElements array by filtering out all collected elements
    dtElements = dtElements.filter(el => !removedIds.has(el.data.id));

    // Update currentDtFocusNode if the deleted node was the focus or an ancestor of the focus
    if (currentDtFocusNode && removedIds.has(currentDtFocusNode.id)) {
        // If the focus node was deleted, or an ancestor of the focus node was deleted
        // Find the parent of the *original* nodeToDelete to set as new focus
        const parentNodeId = incomingEdgesToDeletedNode.length > 0 ? incomingEdgesToDeletedNode[0].source().id() : null;
        if (parentNodeId && cy.getElementById(parentNodeId).length > 0) { // Check if parent still exists in graph
            currentDtFocusNode = cy.getElementById(parentNodeId).data();
        } else {
            currentDtFocusNode = dtRootNode; // Fallback to root if parent is also gone or no parent
        }
        // Re-apply highlight to the new focus node
        cy.elements().removeClass('selected-focus');
        if (currentDtFocusNode) {
            cy.getElementById(currentDtFocusNode.id).addClass('selected-focus');
        }
    }

    // Update UI displays
    updateDtFocusNodeDisplay();
    updateDtChildTypeOptions();
    updateProbabilitySumDisplay();
    updateDtTreeStructureList();
    // applyDtLayout(); // Optional: re-layout if desired, but might cause shifts

    alert(`节点 "${nodeLabel}" 及其子树已删除。`);
});


clearDtDiagramBtn.addEventListener('click', () => {
    if (confirm('确定要清空所有决策树数据吗？此操作无法撤销。')) {
        dtRootNode = null;
        currentDtFocusNode = null;
        dtElements = [];
        initializeCytoscape(); // Reset Cytoscape
        updateDtFocusNodeDisplay(); // Reset focus display
        updateDtChildTypeOptions(); // Reset options
        updateProbabilitySumDisplay(); // Reset probability sum
        updateDtTreeStructureList(); // Clear list
        // Stay in decision tree mode, no need to call switchMode
    }
});


// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    initializeCytoscape();
    switchMode('influence'); // Start in influence diagram mode by default
});
