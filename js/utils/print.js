export function printColumn(column, tasks) {
    if (!column || !tasks) return;

    // Create print container
    const container = document.createElement('div');
    container.className = 'print-container';

    // Header
    const header = document.createElement('h1');
    header.textContent = column.title;
    container.appendChild(header);

    // Metadata
    const meta = document.createElement('div');
    meta.className = 'print-meta';
    meta.textContent = `List: ${column.title} | Printed: ${new Date().toLocaleDateString()}`;
    container.appendChild(meta);

    // Task List
    const list = document.createElement('ul');
    list.className = 'print-list';

    tasks.forEach(task => {
        const item = document.createElement('li');
        item.className = 'print-item';

        // Checkbox glyph
        const checkbox = document.createElement('span');
        checkbox.className = 'print-checkbox';
        checkbox.textContent = '[ ] ';
        item.appendChild(checkbox);

        // Content
        const content = document.createElement('div');
        content.className = 'print-content';

        const title = document.createElement('div');
        title.className = 'print-title';
        title.textContent = task.title;
        content.appendChild(title);

        // Subtasks if any
        if (task.subtasks && task.subtasks.length > 0) {
            const subList = document.createElement('ul');
            subList.className = 'print-subtasks';
            task.subtasks.forEach(sub => {
                const subItem = document.createElement('li');
                subItem.textContent = `[${sub.done ? 'x' : ' '}] ${sub.text}`;
                subList.appendChild(subItem);
            });
            content.appendChild(subList);
        }

        item.appendChild(content);
        list.appendChild(item);
    });

    container.appendChild(list);
    document.body.appendChild(container);

    // Trigger print
    window.print();

    // Cleanup
    // Use setTimeout to ensure print dialog has captured the DOM
    setTimeout(() => {
        document.body.removeChild(container);
    }, 500);
}
