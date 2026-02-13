import { store, mutations } from '../store.js';

Vue.component('task-modal', {
    template: `
        <div class="modal-backdrop" @click.self="close" v-if="task">
            <div class="modal-content" :class="colorClass">
                <header class="modal-header">
                    <div class="modal-title-row">
                        <input
                            type="checkbox"
                            class="task-checkbox modal-checkbox"
                            :checked="task.isCompleted"
                            @change="toggleCompleted"
                            title="Mark as complete"
                        >
                        <input 
                            class="modal-title-input"
                            :class="{ 'title-completed': task.isCompleted }"
                            v-model="localTitle" 
                            @blur="saveTitle" 
                            @keyup.enter="$event.target.blur()"
                            placeholder="Task Title"
                        >
                    </div>
                    <button class="close-btn" @click="close" title="Close Modal"><i class="fas fa-times"></i></button>
                </header>
                
                <div class="modal-body">
                    <div class="form-group">
                        <label>Description</label>
                        <textarea 
                            v-model="localDescription" 
                            @blur="saveDescription" 
                            placeholder="Add a description..."
                            rows="4"
                        ></textarea>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Due Date</label>
                            <input type="date" v-model="localDueDate" @change="saveDueDate" title="Set Due Date">
                        </div>
                        <div class="form-group">
                            <label>Color</label>
                            <div class="color-picker">
                                <button 
                                    v-for="color in colors" 
                                    :key="color"
                                    class="color-dot"
                                    :class="['bg-' + color, { selected: localColor === color }]"
                                    @click="saveColor(color)"
                                    :title="'Set color to ' + color"
                                ></button>
                            </div>
                        </div>
                    </div>

                    <div class="subtasks-section">
                        <label>Subtasks</label>
                        <div class="progress-bar" v-if="subtasks.length > 0">
                            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
                        </div>
                        
                        <ul class="subtask-list">
                            <li v-for="(st, index) in subtasks" :key="index" class="subtask-item">
                                <input 
                                    type="checkbox" 
                                    :checked="st.done" 
                                    @change="toggleSubtask(index, $event.target.checked)"
                                    title="Mark as done"
                                >
                                <input 
                                    type="text" 
                                    :value="st.text" 
                                    @change="updateSubtaskText(index, $event.target.value)"
                                    class="subtask-input"
                                    :class="{ completed: st.done }"
                                    placeholder="Subtask..."
                                >
                                <button class="delete-subtask-btn" @click="deleteSubtask(index)" title="Delete Subtask">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </li>
                        </ul>
                        
                        <div class="add-subtask">
                            <i class="fas fa-plus"></i>
                            <input 
                                type="text" 
                                v-model="newSubtaskText" 
                                @keyup.enter="addSubtask" 
                                placeholder="Add a subtask..."
                                title="Press Enter to add subtask"
                            >
                        </div>
                    </div>
                </div>

                <footer class="modal-footer">
                    <button class="btn btn-danger" @click="deleteTask" title="Permanently delete this task">Delete Task</button>
                    <button class="btn btn-primary" @click="close">OK</button>
                </footer>
            </div>
        </div>
    `,
    data() {
        return {
            localTitle: '',
            localDescription: '',
            localDueDate: null,
            localColor: 'gray',
            newSubtaskText: '',
            colors: ['gray', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink']
        };
    },
    computed: {
        task() {
            return store.activeTaskId ? store.tasks[store.activeTaskId] : null;
        },
        subtasks() {
            return this.task ? (this.task.subtasks || []) : [];
        },
        colorClass() {
            return `task-color-${this.localColor}`;
        },
        progress() {
            if (!this.subtasks.length) return 0;
            const done = this.subtasks.filter(st => st.done).length;
            return (done / this.subtasks.length) * 100;
        }
    },
    watch: {
        task: {
            immediate: true,
            handler(newTask) {
                if (newTask) {
                    this.localTitle = newTask.title;
                    this.localDescription = newTask.description || '';
                    this.localDueDate = newTask.dueDate;
                    this.localColor = newTask.color || 'gray';
                }
            }
        }
    },
    mounted() {
        document.addEventListener('keydown', this.onEsc);
    },
    beforeDestroy() {
        document.removeEventListener('keydown', this.onEsc);
    },
    methods: {
        close() {
            store.activeTaskId = null;
        },
        toggleCompleted() {
            mutations.toggleTaskCompletion(this.task.id);
        },
        onEsc(e) {
            if (e.key === 'Escape') this.close();
        },
        saveTitle() {
            if (this.localTitle.trim() !== this.task.title) {
                mutations.updateTask(this.task.id, { title: this.localTitle });
            }
        },
        saveDescription() {
            if (this.localDescription !== this.task.description) {
                mutations.updateTask(this.task.id, { description: this.localDescription });
            }
        },
        saveDueDate() {
            mutations.updateTask(this.task.id, { dueDate: this.localDueDate });
        },
        saveColor(color) {
            this.localColor = color;
            mutations.updateTask(this.task.id, { color: color });
        },
        deleteTask() {
            if (confirm('Are you sure you want to delete this task?')) {
                mutations.deleteTask(this.task.id);
            }
        },
        addSubtask() {
            if (this.newSubtaskText.trim()) {
                mutations.addSubtask(this.task.id, this.newSubtaskText.trim());
                this.newSubtaskText = '';
            }
        },
        toggleSubtask(index, done) {
            mutations.updateSubtask(this.task.id, index, { done });
        },
        updateSubtaskText(index, text) {
            mutations.updateSubtask(this.task.id, index, { text });
        },
        deleteSubtask(index) {
            mutations.deleteSubtask(this.task.id, index);
        }
    }
});
