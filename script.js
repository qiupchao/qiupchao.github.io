// Register the dagre layout for Cytoscape.js
cytoscape.use(cytoscapeDagre);

let cy; // Variable to hold our Cytoscape.js instance
let currentMode = 'influence'; // 'influence' or 'decisionTree'

// --- Influence Diagram Data & Management ---
let infNodes = [];
let infInfluences = [];

// --- Decision Tree Data & Management ---
let dtRootNode = null; // The root of the decision tree
let currentDtFocusNode = null; // The node currently being edited/added children to
let dtElements = []; // Cytoscape elements for decision tree

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
                    'curve-style': 'bezier', // or 'taxi' for right-angle bends
                    'label': 'data(label)', // Label on edge for decision tree branches
                    'font-size': '10px',
                    'text-background-opacity': 1,
                    'text-background-color': '#fff',
                    'text-background-padding': '3px',
                    'color': '#555'
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
                selector: '.decision-node', // Decision Point
                style: {
                    'shape': 'rectangle',
                    'background-color': '#ADD8E6' // Light Blue
                }
            },
            {
                selector: '.chance-node', // Uncertainty/Chance Point
                style: {
                    'shape': 'ellipse',
                    'background-color': '#90EE90' // Light Green
                }
            },
            {
                selector: '.terminal-node', // Result/Terminal Point
                style: {
                    'shape': 'diamond',
                    'background-color': '#FFB6C1' // Light Pink
                }
            },
            {
                selector: '.dt-branch-edge', // Edges representing branches
                style: {
                    'label': 'data(label)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'text-rotation': 'autorotate'
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
            const nodeId = evt.target.id();
            const nodeType = evt.target.data('type');

            if (nodeType !== 'branch') { // Branches are edges, not nodes
                currentDtFocusNode = evt.target.data(); // Store the full data object
                updateDtFocusNodeDisplay();
                updateDtChildTypeOptions();
                updateProbabilitySumDisplay();
                // Highlight the selected node visually (optional)
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
    cy.add(infNodes.map(n => ({group: 'nodes', data: n})));
    cy.add(infInfluences);
    applyInfLayout();
}

function applyInfLayout() {
    cy.layout({
        name: 'dagre',
        rankDir: 'LR',
        nodeSep: 70,
        rankSep: 100,
        padding: 30
    }).run();
}

// --- Decision Tree Specific Functions ---
function updateDtFocusNodeDisplay() {
    currentFocusNodeSpan.textContent = currentDtFocusNode ? currentDtFocusNode.label : "根节点";
}

function updateDtChildTypeOptions() {
    dtProbabilityInput.classList.add('hidden');
    dtValueInput.classList.add('hidden');
    dtChildTypeSelect.value = ""; // Reset selection

    const options = dtChildTypeSelect.options;
    for (let i = options.length - 1; i >= 0; i--) {
        options[i].remove();
    }
    options.add(new Option("-- 选择类型 --", ""));

    if (!currentDtFocusNode || currentDtFocusNode.type === 'terminal') {
        // Only root or after terminal node: can start a new decision
        options.add(new Option("决策点", "decision"));
    } else if (currentDtFocusNode.type === 'decision') {
        options.add(new Option("分支 (决策选项)", "branch"));
    } else if (currentDtFocusNode.type === 'chance') {
        options.add(new Option("分支 (事件结果)", "branch"));
    } else if (currentDtFocusNode.type === 'branch') {
        // A branch can lead to another decision, chance, or terminal node
        options.add(new Option("决策点", "decision"));
        options.add(new Option("不确定事件点", "chance"));
        options.add(new Option("结果点", "terminal"));
    }

    // Event listener for type change to show/hide probability/value inputs
    dtChildTypeSelect.onchange = () => {
        dtProbabilityInput.classList.add('hidden');
        dtValueInput.classList.add('hidden');
        if (dtChildTypeSelect.value === 'branch' && currentDtFocusNode && currentDtFocusNode.type === 'chance') {
            dtProbabilityInput.classList.remove('hidden');
        } else if (dtChildTypeSelect.value === 'terminal') {
            dtValueInput.classList.remove('hidden');
        }
    };
}

function updateProbabilitySumDisplay() {
    if (currentDtFocusNode && currentDtFocusNode.type === 'chance') {
        let sum = 0;
        cy.edges().forEach(edge => {
            if (edge.source().id() === currentDtFocusNode.id && edge.data('probability')) {
                sum += parseFloat(edge.data('probability'));
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
    dtTreeStructureList.innerHTML = '';
    // Recursively display tree structure
    function addToList(node, indent = 0) {
        const li = document.createElement('li');
        let prefix = '  '.repeat(indent);
        let nodeLabel = node.label;
        if (node.type === 'terminal' && node.value !== undefined) {
            nodeLabel += ` (价值: ${node.value})`;
        } else if (node.type === 'branch' && node.probability !== undefined) {
             nodeLabel = `${node.label} (概率: ${node.probability})`; // Branch label on edge
        }

        li.textContent = `${prefix}${nodeLabel} [${node.type}]`;

        // Highlight current focus node in the list
        if (currentDtFocusNode && node.id === currentDtFocusNode.id) {
            li.style.fontWeight = 'bold';
            li.style.backgroundColor = '#e0e0e0';
        }

        dtTreeStructureList.appendChild(li);

        cy.edges().forEach(edge => {
            if (edge.source().id() === node.id && edge.data('type') === 'branch') {
                // Find the child node of this branch edge
                const childNode = cy.getElementById(edge.target().id()).data();
                if (childNode) {
                    addToList(childNode, indent + 1);
                }
            }
        });
    }

    if (dtRootNode) {
        addToList(dtRootNode);
    }
}


function loadDecisionTreeDiagram() {
    cy.elements().remove(); // Clear current graph
    cy.add(dtElements);
    applyDtLayout();
}

function applyDtLayout() {
    cy.layout({
        name: 'dagre',
        rankDir: 'LR',
        nodeSep: 50,  // Space between nodes in the same rank
        rankSep: 120, // Space between ranks (layers)
        padding: 30,
        fit: true
    }).run();
}


// --- Event Listeners ---

// Mode Switching
influenceModeBtn.addEventListener('click', () => switchMode('influence'));
decisionTreeModeBtn.addEventListener('click', () => switchMode('decisionTree'));

// --- Influence Diagram Event Listeners (from previous version) ---
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
    infNodes.push(newNode);
    
    // Update Cytoscape directly
    cy.add({group: 'nodes', data: newNode});
    
    infNodeNameInput.value = '';
    updateInfNodeSelects();
    updateInfNodeListDisplay();
    applyInfLayout();
});

addInfluenceBtn.addEventListener('click', () => {
    const sourceNodeId = sourceNodeSelect.value;
    const targetNodeId = targetNodeSelect.value;

    if (!sourceNodeId || !targetNodeId) { alert('请选择源节点和目标节点。'); return; }
    if (sourceNodeId === targetNodeId) { alert('源节点和目标节点不能相同。'); return; }

    const edgeId = `${sourceNodeId}-${targetNodeId}`;
    if (infInfluences.some(edge => edge.data.id === edgeId)) { alert(`影响关系 "${sourceNodeId} -> ${targetNodeId}" 已经存在。`); return; }

    const newInfluence = {
        group: 'edges',
        data: { id: edgeId, source: sourceNodeId, target: targetNodeId }
    };
    infInfluences.push(newInfluence);

    // Update Cytoscape directly
    cy.add(newInfluence);
    
    updateInfluenceListDisplay();
    applyInfLayout();
});

applyInfLayoutBtn.addEventListener('click', () => applyInfLayout());

exportInfImageBtn.addEventListener('click', () => {
    const png64 = cy.png({ full: true, scale: 2 });
    const downloadLink = document.createElement('a');
    downloadLink.href = png64;
    downloadLink.download = 'influence_diagram.png';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
});

clearInfDiagramBtn.addEventListener('click', () => {
    if (confirm('确定要清空所有影响图数据吗？此操作无法撤销。')) {
        infNodes = [];
        infInfluences = [];
        initializeCytoscape(); // Re-initialize Cytoscape instance
        updateInfNodeSelects();
        updateInfNodeListDisplay();
        updateInfluenceListDisplay();
        switchMode('influence'); // Stay in influence mode
    }
});


// --- Decision Tree Event Listeners ---
goToRootBtn.addEventListener('click', () => {
    if (dtRootNode) {
        currentDtFocusNode = dtRootNode;
        updateDtFocusNodeDisplay();
        updateDtChildTypeOptions();
        updateProbabilitySumDisplay();
        cy.elements().removeClass('selected-focus');
        cy.getElementById(dtRootNode.id).addClass('selected-focus');
    }
});

goToParentBtn.addEventListener('click', () => {
    if (currentDtFocusNode && currentDtFocusNode.parent) {
        // Find the parent node (which is actually the source of the branch edge)
        const parentEdge = cy.getElementById(currentDtFocusNode.parent);
        if (parentEdge) {
            const parentNode = parentEdge.source().data();
            currentDtFocusNode = parentNode;
            updateDtFocusNodeDisplay();
            updateDtChildTypeOptions();
            updateProbabilitySumDisplay();
            cy.elements().removeClass('selected-focus');
            cy.getElementById(parentNode.id).addClass('selected-focus');
        }
    } else {
        currentDtFocusNode = dtRootNode; // Go to root if no specific parent
        updateDtFocusNodeDisplay();
        updateDtChildTypeOptions();
        updateProbabilitySumDisplay();
        cy.elements().removeClass('selected-focus');
        if (dtRootNode) cy.getElementById(dtRootNode.id).addClass('selected-focus');
    }
});


addDtChildBtn.addEventListener('click', () => {
    const childName = dtChildNameInput.value.trim();
    const childType = dtChildTypeSelect.value;
    const probability = parseFloat(dtProbabilityInput.value);
    const value = parseFloat(dtValueInput.value);

    if (!childName) { alert('请输入子节点或分支名称。'); return; }
    if (!childType) { alert('请选择子节点或分支类型。'); return; }

    const newId = `node-${Date.now()}`; // Unique ID for new node/edge

    if (!currentDtFocusNode) { // Adding the root node
        if (childType !== 'decision') {
            alert('决策树的根节点必须是“决策点”。');
            return;
        }
        dtRootNode = { id: newId, label: childName, type: 'decision', classes: 'decision-node' };
        currentDtFocusNode = dtRootNode;
        dtElements.push({ group: 'nodes', data: dtRootNode });
    } else { // Adding children to an existing node
        const parentId = currentDtFocusNode.id;
        let edgeLabel = childName; // Default label for edge

        if (currentDtFocusNode.type === 'chance') {
            if (childType !== 'branch') {
                alert('不确定性事件点只能添加“分支”。');
                return;
            }
            if (isNaN(probability) || probability <= 0 || probability > 1) {
                alert('请为不确定性分支输入有效的概率 (0-1)。');
                return;
            }
            // Check probability sum if it's a chance node
            let currentSum = 0;
            cy.edges().forEach(edge => {
                if (edge.source().id() === parentId && edge.data('probability')) {
                    currentSum += parseFloat(edge.data('probability'));
                }
            });
            if (currentSum + probability > 1.001) { // Allow for tiny floating point errors
                 alert(`警告: 概率总和将超过 1 (${(currentSum + probability).toFixed(2)})。请调整。`);
                 return;
            }
            edgeLabel = `${childName} (p=${probability.toFixed(2)})`;

        } else if (currentDtFocusNode.type === 'decision') {
            if (childType !== 'branch') {
                alert('决策点只能添加“分支”。');
                return;
            }
        } else if (currentDtFocusNode.type === 'branch') {
            // Branch can lead to decision, chance, or terminal
        } else if (currentDtFocusNode.type === 'terminal') {
            alert('结果点不能添加子节点。');
            return;
        }

        const newChildNode = { id: newId, label: childName, type: childType };
        let nodeClasses = '';
        if (childType === 'decision') {
            nodeClasses = 'decision-node';
        } else if (childType === 'chance') {
            nodeClasses = 'chance-node';
        } else if (childType === 'terminal') {
            nodeClasses = 'terminal-node';
            if (!isNaN(value)) {
                newChildNode.value = value; // Store value
                newChildNode.label = `${childName} (价值: ${value})`; // Update label
            } else {
                alert('结果点需要输入价值。');
                return;
            }
        } else if (childType === 'branch') {
            // Branch is an edge, not a node. It links a node to a new node.
            // We need a dummy node for the branch to connect to if it's not a terminal
            // For simplicity, we create a new node and then an edge.
            // The edge will have the label and probability.
            // The actual node represents the "state" after the branch.

            const branchEdgeId = `edge-${parentId}-${newId}`;
            if (dtElements.some(el => el.group === 'edges' && el.data.id === branchEdgeId)) {
                alert(`分支 "${childName}" 已经存在。`);
                return;
            }

            const branchEdge = {
                group: 'edges',
                data: {
                    id: branchEdgeId,
                    source: parentId,
                    target: newId, // This will be the ID of the new node created below
                    label: edgeLabel,
                    type: 'branch', // Custom type for edge classification
                    probability: (currentDtFocusNode.type === 'chance' ? probability : undefined) // Store probability
                },
                classes: 'dt-branch-edge'
            };
            dtElements.push(branchEdge);
            // After adding branch edge, the new node created is the one we "focus" on
            currentDtFocusNode = newChildNode; // New node becomes focus
        }

        if (childType !== 'branch') { // Only add actual nodes (not just branch edges)
             dtElements.push({ group: 'nodes', data: newChildNode, classes: nodeClasses });
        } else { // If we're adding a branch, the new child becomes the focus node
             // The new node is added below, and this branch edge is created.
             // We need to link this branch edge to a *new* node.
             // Let's create an implicit "dummy" node for the end of the branch.
             // Or, more correctly, the branch edge leads to the actual next node.
             // For simplicity, we just create the node. The "branch" type refers to the edge.
        }
    }

    // Clear inputs
    dtChildNameInput.value = '';
    dtProbabilityInput.value = '';
    dtValueInput.value = '';
    dtChildTypeSelect.value = '';
    dtProbabilityInput.classList.add('hidden');
    dtValueInput.classList.add('hidden');

    loadDecisionTreeDiagram(); // Reload to reflect changes
    updateDtFocusNodeDisplay(); // Update focus display
    updateDtChildTypeOptions(); // Update options based on new focus
    updateProbabilitySumDisplay();
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
    const png64 = cy.png({ full: true, scale: 2 });
    const downloadLink = document.createElement('a');
    downloadLink.href = png64;
    downloadLink.download = 'decision_tree.png';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
});

clearDtDiagramBtn.addEventListener('click', () => {
    if (confirm('确定要清空所有决策树数据吗？此操作无法撤销。')) {
        dtRootNode = null;
        currentDtFocusNode = null;
        dtElements = [];
        initializeCytoscape();
        updateDtFocusNodeDisplay();
        updateDtChildTypeOptions();
        updateProbabilitySumDisplay();
        updateDtTreeStructureList();
        switchMode('decisionTree'); // Stay in decision tree mode
    }
});


// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    initializeCytoscape();
    switchMode('influence'); // Start in influence diagram mode by default
});
