"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var Backbone = require("backbone");
var _ = require("underscore");
// Todo Model
// ----------
// Our basic **Todo** model has `title`, `order`, and `completed` attributes.
var Todo = /** @class */ (function (_super) {
    __extends(Todo, _super);
    function Todo() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    // Default attributes for the todo.
    Todo.prototype.defaults = function () {
        return {
            title: '',
            completed: false
        };
    };
    // Ensure that each todo created has `title`.
    Todo.prototype.initialize = function () {
        if (!this.get('title')) {
            this.set({ 'title': this.defaults().title });
        }
    };
    // Toggle the `completed` state of this todo item.
    Todo.prototype.toggle = function () {
        this.save({ completed: !this.get('completed') });
    };
    // Remove this Todo from *localStorage* and delete its view.
    Todo.prototype.clear = function () {
        this.destroy();
    };
    return Todo;
}(Backbone.Model));
// Todo Collection
// ---------------
// The collection of todos is backed by *localStorage* instead of a remote
// server.
var TodoList = /** @class */ (function (_super) {
    __extends(TodoList, _super);
    function TodoList() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Reference to this collection's model.
        _this.model = Todo;
        // Save all of the todo items under the `'todos'` namespace.
        _this.localStorage = new Store('todos-typescript-backbone');
        // Todos are sorted by their original insertion order.
        _this.comparator = function (todo) {
            return todo.get('order');
        };
        return _this;
    }
    // Filter down the list of all todo items that are completed.
    TodoList.prototype.completed = function () {
        return this.filter(function (todo) { return todo.get('completed'); });
    };
    // Filter down the list to only todo items that are still not completed.
    TodoList.prototype.remaining = function () {
        return this.without.apply(this, this.completed());
    };
    // We keep the Todos in sequential order, despite being saved by unordered
    // GUID in the database. This generates the next order number for new items.
    TodoList.prototype.nextOrder = function () {
        if (!length)
            return 1;
        return this.last().get('order') + 1;
    };
    return TodoList;
}(Backbone.Collection));
// Create our global collection of **Todos**.
var Todos = new TodoList();
var taskFilter;
// Todo Item View
// --------------
// The DOM element for a todo item...
var TodoView = /** @class */ (function (_super) {
    __extends(TodoView, _super);
    function TodoView(options) {
        var _this = _super.call(this, options) || this;
        //... is a list tag.
        _this.tagName = 'li';
        // Cache the template function for a single item.
        _this.template = _.template($('#item-template').html());
        _.bindAll(_this, 'render', 'close', 'remove', 'toggleVisible');
        _this.model.bind('change', _this.render);
        _this.model.bind('destroy', _this.remove);
        _this.model.bind('visible', _this.toggleVisible);
        return _this;
    }
    // The DOM events specific to an item.
    TodoView.prototype.events = function () {
        return {
            'click .check': 'toggleDone',
            'dblclick label.todo-content': 'edit',
            'click button.destroy': 'clear',
            'keypress .edit': 'updateOnEnter',
            'keydown .edit': 'revertOnEscape',
            'blur .edit': 'close'
        };
    };
    // Re-render the contents of the todo item.
    TodoView.prototype.render = function () {
        this.$el
            .html(this.template(this.model.toJSON()))
            .toggleClass('completed', this.model.get('completed'));
        this.toggleVisible();
        this.input = this.$('.todo-input');
        return this;
    };
    // Toggle the `completed` state of the model.
    TodoView.prototype.toggleDone = function () {
        this.model.toggle();
    };
    TodoView.prototype.toggleVisible = function () {
        var completed = this.model.get('completed');
        var hidden = (taskFilter === 'completed' && !completed) ||
            (taskFilter === 'active' && completed);
        this.$el.toggleClass('hidden', hidden);
    };
    // Switch this view into `'editing'` mode, displaying the input field.
    TodoView.prototype.edit = function () {
        this.$el.addClass('editing');
        this.input.focus();
    };
    // Close the `'editing'` mode, saving changes to the todo.
    TodoView.prototype.close = function () {
        var trimmedValue = this.input.val().trim();
        if (trimmedValue) {
            this.model.save({ title: trimmedValue });
        }
        else {
            this.clear();
        }
        this.$el.removeClass('editing');
    };
    // If you hit `enter`, we're through editing the item.
    TodoView.prototype.updateOnEnter = function (e) {
        if (e.which === TodoView.ENTER_KEY)
            this.close();
    };
    // If you're pressing `escape` we revert your change by simply leaving
    // the `editing` state.
    TodoView.prototype.revertOnEscape = function (e) {
        if (e.which === TodoView.ESC_KEY) {
            this.$el.removeClass('editing');
            // Also reset the hidden input back to the original value.
            this.input.val(this.model.get('title'));
        }
    };
    // Remove the item, destroy the model.
    TodoView.prototype.clear = function () {
        this.model.clear();
    };
    TodoView.ENTER_KEY = 13;
    TodoView.ESC_KEY = 27;
    return TodoView;
}(Backbone.View));
// Todo Router
// -----------
var TodoRouter = /** @class */ (function (_super) {
    __extends(TodoRouter, _super);
    function TodoRouter() {
        var _this = _super.call(this) || this;
        _this.routes = {
            '*filter': 'setFilter'
        };
        _this._bindRoutes();
        return _this;
    }
    TodoRouter.prototype.setFilter = function (param) {
        if (param === void 0) { param = ''; }
        // Trigger a collection filter event, causing hiding/unhiding
        // of Todo view items
        Todos.trigger('filter', param);
    };
    return TodoRouter;
}(Backbone.Router));
// The Application
// ---------------
// Our overall **AppView** is the top-level piece of UI.
var AppView = /** @class */ (function (_super) {
    __extends(AppView, _super);
    function AppView() {
        var _this = _super.call(this) || this;
        // Instead of generating a new element, bind to the existing skeleton of
        // the App already present in the HTML.
        _this.setElement($('.todoapp'), true);
        // At initialization we bind to the relevant events on the `Todos`
        // collection, when items are added or changed. Kick things off by
        // loading any preexisting todos that might be saved in *localStorage*.
        _.bindAll(_this, 'addOne', 'addAll', 'render', 'toggleAllComplete', 'filter');
        _this.input = _this.$('.new-todo');
        _this.allCheckbox = _this.$('.toggle-all')[0];
        _this.mainElement = _this.$('.main')[0];
        _this.footerElement = _this.$('.footer')[0];
        _this.statsTemplate = _.template($('#stats-template').html());
        Todos.bind('add', _this.addOne);
        Todos.bind('reset', _this.addAll);
        Todos.bind('all', _this.render);
        Todos.bind('change:completed', _this.filterOne);
        Todos.bind('filter', _this.filter);
        Todos.fetch();
        // Initialize the router, showing the selected view
        var todoRouter = new TodoRouter();
        Backbone.history.start();
        return _this;
    }
    // Delegated events for creating new items, and clearing completed ones.
    AppView.prototype.events = function () {
        return {
            'keypress .new-todo': 'createOnEnter',
            'click .todo-clear button': 'clearCompleted',
            'click .toggle-all': 'toggleAllComplete'
        };
    };
    // Re-rendering the App just means refreshing the statistics -- the rest
    // of the app doesn't change.
    AppView.prototype.render = function () {
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
        }
        else {
            this.mainElement.style.display = 'none';
            this.footerElement.style.display = 'none';
        }
        //this.allCheckbox.attr('checked', !remaining);
        return this;
    };
    // Add a single todo item to the list by creating a view for it, and
    // appending its element to the `<ul>`.
    AppView.prototype.addOne = function (todo) {
        var view = new TodoView({ model: todo });
        this.$('.todo-list').append(view.render().el);
    };
    // Add all items in the **Todos** collection at once.
    AppView.prototype.addAll = function () {
        Todos.each(this.addOne);
    };
    // Filter out completed/remaining tasks
    AppView.prototype.filter = function (criteria) {
        taskFilter = criteria;
        this.filterAll();
    };
    AppView.prototype.filterOne = function (todo) {
        todo.trigger('visible');
    };
    AppView.prototype.filterAll = function () {
        Todos.each(this.filterOne);
    };
    // Generate the attributes for a new Todo item.
    AppView.prototype.newAttributes = function () {
        return {
            title: this.input.val().trim(),
            order: Todos.nextOrder(),
            completed: false
        };
    };
    // If you hit return in the main input field, create new **Todo** model,
    // persisting it to *localStorage*.
    AppView.prototype.createOnEnter = function (e) {
        if (e.which === TodoView.ENTER_KEY && this.input.val().trim()) {
            Todos.create(this.newAttributes());
            this.input.val('');
        }
    };
    // Clear all completed todo items, destroying their models.
    AppView.prototype.clearCompleted = function () {
        _.each(Todos.completed(), function (todo) { return todo.clear(); });
        return false;
    };
    AppView.prototype.toggleAllComplete = function () {
        //var completed = this.allCheckbox.checked;
        //Todos.each((todo: Todo) => todo.save({ 'completed': completed }));
    };
    return AppView;
}(Backbone.View));
// Load the application once the DOM is ready, using `jQuery.ready`:
$(function () {
    // Finally, we kick things off by creating the **App**.
    new AppView();
});
