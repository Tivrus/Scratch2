// Debug Panel functionality
class DebugPanel {
    constructor() {
        this.panel = document.createElement('div');
        this.panel.style.cssText = `
            position: fixed;
            top: 100px;
            left: 10px;
            background: rgba(0, 0, 0, 0.9);
            color: #00ff00;
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 14px;
            z-index: 99999;
            border: 2px solid #00ff00;
            min-width: 200px;
            pointer-events: none;
        `;
        document.body.appendChild(this.panel);
        
        // Add global mouse move listener
        document.addEventListener('mousemove', (e) => {
            this.updateMousePosition(e);
        });
    }

    updateMousePosition(moveEvent) {
        const workspace = document.getElementById('scripts-workspace');
        if (!workspace) return;

        const workspaceRect = workspace.getBoundingClientRect();
        
        // Calculate relative mouse coordinates within workspace
        const relativeMouseX = moveEvent.clientX - workspaceRect.left;
        const relativeMouseY = moveEvent.clientY - workspaceRect.top;

        // Update only mouse coordinates in the panel
        const mouseInfo = `
            <div>Global Mouse:</div>
            <div>clientX: ${Math.round(moveEvent.clientX)}</div>
            <div>clientY: ${Math.round(moveEvent.clientY)}</div>
            <div>Relative Mouse (Workspace):</div>
            <div>relX: ${Math.round(relativeMouseX)}</div>
            <div>relY: ${Math.round(relativeMouseY)}</div>
        `;

        // If we have block dragging info, append it
        if (this.currentBlockInfo) {
            this.panel.innerHTML = mouseInfo + this.currentBlockInfo;
        } else {
            this.panel.innerHTML = mouseInfo;
        }
    }

    update(moveEvent, workspace, block, dragOffsetX, dragOffsetY) {
        if (!moveEvent || !workspace || !block) {
            console.log('Debug panel update skipped:', { moveEvent, workspace, block });
            return;
        }

        try {
            const workspaceRect = workspace.getBoundingClientRect();
            const blockRect = block.getBoundingClientRect();
            
            // Calculate relative mouse coordinates within workspace
            const relativeMouseX = moveEvent.clientX - workspaceRect.left;
            const relativeMouseY = moveEvent.clientY - workspaceRect.top;
            
            // Calculate relative mouse position to block
            const relativeToBlockX = moveEvent.clientX - blockRect.left;
            const relativeToBlockY = moveEvent.clientY - blockRect.top;
            
            // Calculate new block position
            const newX = moveEvent.clientX - workspaceRect.left - dragOffsetX + workspace.scrollLeft;
            const newY = moveEvent.clientY - workspaceRect.top - dragOffsetY + workspace.scrollTop;

            // Store block info for the panel
            this.currentBlockInfo = `
                <div>Workspace:</div>
                <div>left: ${Math.round(workspaceRect.left)}</div>
                <div>top: ${Math.round(workspaceRect.top)}</div>
                <div>scrollLeft: ${workspace.scrollLeft}</div>
                <div>scrollTop: ${workspace.scrollTop}</div>
                <div>Block Offset:</div>
                <div>dragOffsetX: ${Math.round(dragOffsetX)}</div>
                <div>dragOffsetY: ${Math.round(dragOffsetY)}</div>
                <div>Block Position:</div>
                <div>left: ${Math.round(blockRect.left)}</div>
                <div>top: ${Math.round(blockRect.top)}</div>
                <div>width: ${Math.round(blockRect.width)}</div>
                <div>height: ${Math.round(blockRect.height)}</div>
                <div>Relative Mouse (Block):</div>
                <div>relX: ${Math.round(relativeToBlockX)}</div>
                <div>relY: ${Math.round(relativeToBlockY)}</div>
                <div>New Position:</div>
                <div>newX: ${Math.round(newX)}</div>
                <div>newY: ${Math.round(newY)}</div>
            `;

            // Update the panel with both mouse and block info
            this.updateMousePosition(moveEvent);
        } catch (error) {
            console.error('Error updating debug panel:', error);
        }
    }
}

// Create and export debug panel instance
const debugPanel = new DebugPanel();
export default debugPanel; 