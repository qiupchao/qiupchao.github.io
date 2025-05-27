// Register the dagre layout for Cytoscape.js
// This needs to be called after dagre and cytoscape-dagre are loaded
cytoscape.use(cytoscapeDagre);

let cy; // Variable to hold our Cytoscape.js instance

// Function to initialize or re-initialize the Cytoscape.js graph
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
                    'background-color': 'data(color)', // Use 'color' property from node data
                    'label': 'data(id)',
                    'text-valign': 'center',
                    'color': '#333',
                    'font-size': '12px',
                    'padding': '10px',
                    'border-width': '1px',
                    'border-color': '#bbb',
                    'shape': 'data(shape)' // Use 'shape' property from node data
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': '#999',
                    'target-arrow-color': '#999',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier' // 'bezier' or 'taxi' for cleaner lines
                }
            },
            {
                selector: ':selected',
                style: {
                    'border-color': '#007bff',
                    'border-width': '3px',
                    'opacity': 0.8
                }
            }
        ],

        layout: {
            name: 'preset' // Start with a preset layout, then apply dagre later
        }
    });

    // Handle node selection to update influence dropdowns
    cy.on('tap', 'node', function(evt){
        // No specific action on tap, just for potential future features
    });
}

// Global lists to keep track of nodes and influences
let nodes = [];
let influences = [];

// Helper to update the node dropdowns for adding influences
function updateNodeSelects() {
    const sourceSelect = document.getElementById('sourceNodeSelect');
    const targetSelect = document.getElementById('targetNodeSelect');

    // Clear existing options
    sourceSelect.innerHTML = '<option value="">-- Select Source --</option>';
    targetSelect.innerHTML = '<option value="">-- Select Target --</option>';

    // Add nodes to dropdowns
    nodes.forEach(node => {
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

// Helper to update the node list display
function updateNodeListDisplay() {
    const nodeList = document.getElementById('nodeList');
    nodeList.innerHTML = '';
    nodes.forEach(node => {
        const listItem = document.createElement('li');
        listItem.textContent = `${node.id} (${node.type})`;
        nodeList.appendChild(listItem);
    });
}

// Helper to update the influence list display
function updateInfluenceListDisplay() {
    const influenceList = document.getElementById('influenceList');
    influenceList.innerHTML = '';
    influences.forEach(edge => {
        const listItem = document.createElement('li');
        listItem.textContent = `${edge.data.source} → ${edge.data.target}`;
        influenceList.appendChild(listItem);
    });
}

// --- Event Listeners ---

// Add Node Button Click
document.getElementById('addNodeBtn').addEventListener('click', () => {
    const nodeName = document.getElementById('nodeNameInput').value.trim();
    const nodeType = document.getElementById('nodeTypeSelect').value;

    if (!nodeName) {
        alert('Please enter a node name.');
        return;
    }

    if (nodes.some(node => node.id === nodeName)) {
        alert(`Node "${nodeName}" already exists.`);
        return;
    }

    let shape, color;
    switch (nodeType) {
        case 'decision':
            shape = 'roundrectangle'; // Or 'rectangle'
            color = 'lightblue';
            break;
        case 'uncertainty':
            shape = 'ellipse'; // Or 'oval'
            color = 'lightgreen';
            break;
        case 'value':
            shape = 'diamond';
            color = 'lightcoral';
            break;
        default:
            shape = 'rectangle';
            color = 'lightgray';
    }

    const newNode = {
        group: 'nodes',
        data: { id: nodeName, type: nodeType, shape: shape, color: color }
    };
    cy.add(newNode);
    nodes.push(newNode.data); // Store data for internal management

    document.getElementById('nodeNameInput').value = ''; // Clear input
    updateNodeSelects();
    updateNodeListDisplay();

    // Re-apply layout after adding a node for better visualization
    applyLayout();
});

// Add Influence Button Click
document.getElementById('addInfluenceBtn').addEventListener('click', () => {
    const sourceNodeId = document.getElementById('sourceNodeSelect').value;
    const targetNodeId = document.getElementById('targetNodeSelect').value;

    if (!sourceNodeId || !targetNodeId) {
        alert('Please select both source and target nodes.');
        return;
    }
    if (sourceNodeId === targetNodeId) {
        alert('Source and target nodes cannot be the same.');
        return;
    }

    const edgeId = `${sourceNodeId}-${targetNodeId}`;
    if (influences.some(edge => edge.data.id === edgeId)) {
        alert(`Influence "${sourceNodeId} -> ${targetNodeId}" already exists.`);
        return;
    }

    const newInfluence = {
        group: 'edges',
        data: { id: edgeId, source: sourceNodeId, target: targetNodeId }
    };
    cy.add(newInfluence);
    influences.push(newInfluence); // Store edge for internal management

    updateInfluenceListDisplay();

    // Re-apply layout after adding an influence for better visualization
    applyLayout();
});

// Apply Layout Button Click
document.getElementById('applyLayoutBtn').addEventListener('click', () => {
    applyLayout();
});

function applyLayout() {
    cy.layout({
        name: 'dagre', // Directed Acyclic Graph layout
        rankDir: 'LR', // Left to Right
        nodeSep: 70,    // Space between nodes
        rankSep: 100,   // Space between ranks (layers)
        padding: 30
    }).run();
}


// Export as PNG Button Click
document.getElementById('exportImageBtn').addEventListener('click', () => {
    const png64 = cy.png({ full: true, scale: 2 }); // Scale up for higher resolution
    const downloadLink = document.createElement('a');
    downloadLink.href = png64;
    downloadLink.download = 'influence_diagram.png';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
});

// Clear Diagram Button Click
document.getElementById('clearDiagramBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the entire diagram? This cannot be undone.')) {
        nodes = [];
        influences = [];
        initializeCytoscape(); // Re-initialize Cytoscape instance
        updateNodeSelects();
        updateNodeListDisplay();
        updateInfluenceListDisplay();
    }
});


// Initialize the Cytoscape graph when the DOM is ready
document.addEventListener('DOMContentLoaded', initializeCytoscape);