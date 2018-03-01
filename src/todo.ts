import * as Backbone from 'backbone';
import 'backbone.localstorage';
import * as _ from 'underscore';
import * as $ from 'jquery';

// Todo Model
// ----------
// Our basic **Todo** model has `title`, `order`, and `completed` attributes.
class Todo extends Backbone.Model {
	public completed: boolean;

	// Default attributes for the todo.
	defaults() {
		return {
			title: '',
			completed: false
		}
	}

	// Ensure that each todo created has `title`.
	initialize() {
		if (!this.get('title')) {
			this.set({ 'title': this.defaults().title });
		}
	}

	// Toggle the `completed` state of this todo item.
	toggle() {
		this.save({ completed: !this.get('completed') });
	}

	// Remove this Todo from *localStorage* and delete its view.
	clear() {
		this.destroy();
	}

}

// Todo Collection
// ---------------
// The collection of todos is backed by *localStorage* instead of a remote
// server.
class TodoList extends Backbone.Collection<Backbone.Model> {

	// Reference to this collection's model.
	model = Todo;

	// Save all of the todo items under the `'todos'` namespace.
	localStorage = new Backbone.LocalStorage('todos-typescript-backbone');

	// Filter down the list of all todo items that are completed.
	completed() {
		return this.filter((todo: Todo) => todo.get('completed'));
	}

	// Filter down the list to only todo items that are still not completed.
	remaining() {
		return this.without.apply(this, this.completed());
	}

	// We keep the Todos in sequential order, despite being saved by unordered
	// GUID in the database. This generates the next order number for new items.
	nextOrder() {
		if (!length) return 1;
		return this.last().get('order') + 1;
	}

	// Todos are sorted by their original insertion order.
	comparator = function(todo: Todo) {
		return todo.get('order');
	}

}


// Create our global collection of **Todos**.
const Todos = new TodoList();
var taskFilter: String;

// Todo Item View
// --------------
// The DOM element for a todo item...
class TodoView extends Backbone.View<Backbone.Model> {

	// The TodoView listens for changes to its model, re-rendering. Since there's
	// a one-to-one correspondence between a **Todo** and a **TodoView** in this
	// app, we set a direct reference on the model for convenience.
	template: (data: any) => string;

	// A TodoView model must be a Todo, redeclare with specific type
	model: Todo;
	input: any;

	static ENTER_KEY:number = 13;
	static ESC_KEY:number = 27;

	constructor(options?: Backbone.ViewOptions<Backbone.Model>) {


		super(options);
		//... is a list tag.
		this.tagName = 'li';


		// Cache the template function for a single item.
		this.template = _.template($('#item-template').html());

		_.bindAll(this, 'render', 'close', 'remove', 'toggleVisible');
		this.model.bind('change', this.render);
		this.model.bind('destroy', this.remove);
		this.model.bind('visible', this.toggleVisible);
	}
	// The DOM events specific to an item.
	events() {
		return {
			'click .check': 'toggleDone',
			'dblclick label.todo-content': 'edit',
			'click button.destroy': 'clear',
			'keypress .edit': 'updateOnEnter',
			'keydown .edit': 'revertOnEscape',
			'blur .edit': 'close'
		};
    }

	// Re-render the contents of the todo item.
	render() {
		this.$el
			.html(this.template(this.model.toJSON()))
			.toggleClass('completed', this.model.get('completed'));
		this.toggleVisible();
		this.input = this.$('.todo-input');
		return this;
	}

	// Toggle the `completed` state of the model.
	toggleDone() {
		this.model.toggle();
	}

	toggleVisible() {
		var completed =  this.model.get('completed');
		var hidden =
			(taskFilter === 'completed' && !completed) ||
			(taskFilter === 'active' && completed);
		this.$el.toggleClass('hidden', hidden);
	}

	// Switch this view into `'editing'` mode, displaying the input field.
	edit() {
		this.$el.addClass('editing');
		this.input.focus();
	}

	// Close the `'editing'` mode, saving changes to the todo.
	close() {
		var trimmedValue = this.input.val().trim();

		if (trimmedValue) {
			this.model.save({ title: trimmedValue });
		} else {
			this.clear();
		}

		this.$el.removeClass('editing');
	}

	// If you hit `enter`, we're through editing the item.
	updateOnEnter(e: JQueryEventObject) {
		if (e.which === TodoView.ENTER_KEY) this.close();
	}

	// If you're pressing `escape` we revert your change by simply leaving
	// the `editing` state.
	revertOnEscape(e: JQueryEventObject) {
		if (e.which === TodoView.ESC_KEY) {
			this.$el.removeClass('editing');
			// Also reset the hidden input back to the original value.
			this.input.val(this.model.get('title'));
		}
	}

	// Remove the item, destroy the model.
	clear() {
		this.model.clear();
	}

}

// Todo Router
// -----------
class TodoRouter extends Backbone.Router {

	routes = {
		'*filter': 'setFilter'
	};

	constructor() {
		super();
		(<any>this)._bindRoutes();
	}

	setFilter(param: string = '') {
		// Trigger a collection filter event, causing hiding/unhiding
		// of Todo view items
		Todos.trigger('filter', param);
	}
}


// The Application
// ---------------
// Our overall **AppView** is the top-level piece of UI.
class AppView extends Backbone.View<Backbone.Model> {

	// Delegated events for creating new items, and clearing completed ones.
	events() {
		return {
			'keypress .new-todo': 'createOnEnter',
			'click .todo-clear button': 'clearCompleted',
			'click .toggle-all': 'toggleAllComplete'
		};
	}

	input: any;
	allCheckbox: HTMLElement;
	mainElement: HTMLElement;
	footerElement: HTMLElement;
	statsTemplate: (params: any) => string;

	constructor() {
		super();
		// Instead of generating a new element, bind to the existing skeleton of
		// the App already present in the HTML.
		this.setElement($('.todoapp'), true);

		// At initialization we bind to the relevant events on the `Todos`
		// collection, when items are added or changed. Kick things off by
		// loading any preexisting todos that might be saved in *localStorage*.
		_.bindAll(this, 'addOne', 'addAll', 'render', 'toggleAllComplete', 'filter');

		this.input = this.$('.new-todo');
		this.allCheckbox = this.$('.toggle-all')[0];
		this.mainElement = this.$('.main')[0];
		this.footerElement = this.$('.footer')[0];
		this.statsTemplate = _.template($('#stats-template').html());

		Todos.bind('add', this.addOne);
		Todos.bind('reset', this.addAll);
		Todos.bind('all', this.render);
		Todos.bind('change:completed', this.filterOne);
		Todos.bind('filter', this.filter);
		Todos.fetch();

		// Initialize the router, showing the selected view
		const todoRouter = new TodoRouter();
		Backbone.history.start();
	}

	// Re-rendering the App just means refreshing the statistics -- the rest
	// of the app doesn't change.
	render() {
		var completed = Todos.completed().length;
		var remaining = Todos.remaining().length;

		if (Todos.length) {
			this.mainElement.style.display = 'block';
			this.footerElement.style.display = 'block';

			this.$('.todo-stats').html(this.statsTemplate({
				total: Todos.length,
				completed: completed,
				remaining: remaining
			}));

			this.$('.filters li a')
				.removeClass('selected')
				.filter('[href="#/' + (taskFilter || '') + '"]')
				.addClass('selected');

		} else {
			this.mainElement.style.display = 'none';
			this.footerElement.style.display = 'none';
		}

		//this.allCheckbox.attr('checked', !remaining);
		return this;
	}

	// Add a single todo item to the list by creating a view for it, and
	// appending its element to the `<ul>`.
	addOne(todo: Todo) {
		var view = new TodoView({ model: todo });
		this.$('.todo-list').append(view.render().el);
	}

	// Add all items in the **Todos** collection at once.
	addAll() {
		Todos.each(this.addOne);
	}

	// Filter out completed/remaining tasks
	filter(criteria: string) {
		taskFilter = criteria;
		this.filterAll();
	}

	filterOne(todo: Todo) {
		todo.trigger('visible');
	}

	filterAll() {
		Todos.each(this.filterOne);
	}

	// Generate the attributes for a new Todo item.
	newAttributes() {
		return {
			title: this.input.val().trim(),
			order: Todos.nextOrder(),
			completed: false
		};
	}

	// If you hit return in the main input field, create new **Todo** model,
	// persisting it to *localStorage*.
	createOnEnter(e: JQueryEventObject) {
		if (e.which === TodoView.ENTER_KEY && this.input.val().trim()) {
			Todos.create(this.newAttributes());
			this.input.val('');
		}
	}

	// Clear all completed todo items, destroying their models.
	clearCompleted() {
		_.each(Todos.completed(), (todo: Todo) => todo.clear());
		return false;
	}

	toggleAllComplete() {
		//var completed = this.allCheckbox.checked;
		//Todos.each((todo: Todo) => todo.save({ 'completed': completed }));
	}

}

// Load the application once the DOM is ready, using `jQuery.ready`:
$(() => {
	// Finally, we kick things off by creating the **App**.
	new AppView();
});
