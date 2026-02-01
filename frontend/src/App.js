import React, { useState, useEffect } from "react";
import {
	AlertCircle,
	CheckCircle,
	Plus,
	Trash2,
	Edit2,
	LogOut,
} from "lucide-react";

// API Base URL - change this when deploying
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

function App() {
	const [user, setUser] = useState(null);
	const [token, setToken] = useState(localStorage.getItem("token"));
	const [tasks, setTasks] = useState([]);
	const [isLogin, setIsLogin] = useState(true);
	const [formData, setFormData] = useState({
		username: "",
		email: "",
		password: "",
	});
	const [taskForm, setTaskForm] = useState({
		title: "",
		description: "",
		priority: "medium",
		due_date: "",
		category_id: null,
	});
	const [editingTask, setEditingTask] = useState(null);
	const [error, setError] = useState("");
	const [filter, setFilter] = useState("all");
	const [categories, setCategories] = useState([]);
	const [showCategoryForm, setShowCategoryForm] = useState(false);
	const [newCategory, setNewCategory] = useState({ name: "", color: "#3B82F6" });
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		if (token) {
			fetchUser();
			fetchTasks();
			fetchCategories();
		}
	}, [token]);

	const fetchUser = async () => {
		try {
			const response = await fetch(`${API_URL}/tasks`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (response.ok) {
				// User is authenticated
			} else {
				logout();
			}
		} catch (err) {
			console.error("Auth check failed:", err);
		}
	};

	const fetchTasks = async () => {
		try {
			const response = await fetch(`${API_URL}/tasks`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (response.ok) {
				const data = await response.json();
				setTasks(data);
			}
		} catch (err) {
			setError("Failed to fetch tasks");
		}
	};

	const fetchCategories = async () => {
		try {
			const response = await fetch(`${API_URL}/categories`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (response.ok) {
				const data = await response.json();
				setCategories(data);
			}
		} catch (err) {
			console.error("Failed to fetch categories:", err);
		}
	};

	const createCategory = async () => {
		if (!newCategory.name.trim()) {
			setError("Category name is required");
			return;
		}

		try {
			const response = await fetch(`${API_URL}/categories`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(newCategory),
			});

			if (response.ok) {
				await fetchCategories();
				setNewCategory({ name: "", color: "#3B82F6" });
				setShowCategoryForm(false);
			} else {
				const data = await response.json();
				setError(data.message || "Failed to create category");
			}
		} catch (err) {
			setError("Network error. Please try again.");
		}
	};

	const deleteCategory = async (categoryId) => {
		try {
			const response = await fetch(`${API_URL}/categories/${categoryId}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});

			if (response.ok) {
				await fetchCategories();
				await fetchTasks(); // Refresh tasks since their categories changed
			}
		} catch (err) {
			setError("Failed to delete category");
		}
	};

    const getTaskStats = () => {
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const active = total - completed;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Tasks completed in the last 7 days
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const completedThisWeek = tasks.filter(t => {
            if (!t.completed || !t.updated_at) return false;
            const updatedDate = new Date(t.updated_at);
            return updatedDate >= oneWeekAgo;
        }).length;

        // Tasks by priority
        const highPriority = tasks.filter(t => !t.completed && t.priority === 'high').length;
        const mediumPriority = tasks.filter(t => !t.completed && t.priority === 'medium').length;
        const lowPriority = tasks.filter(t => !t.completed && t.priority === 'low').length;

        return {
            total,
            completed,
            active,
            completionRate,
            completedThisWeek,
            highPriority,
            mediumPriority,
            lowPriority
        };

    };

	const handleAuth = async (e) => {
		e.preventDefault();
		setError("");

		const endpoint = isLogin ? "/auth/login" : "/auth/register";
		const body = isLogin
			? { username: formData.username, password: formData.password }
			: formData;

		try {
			const response = await fetch(`${API_URL}${endpoint}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});

			const data = await response.json();

			if (response.ok) {
				if (isLogin) {
					setToken(data.token);
					setUser(data.user);
					localStorage.setItem("token", data.token);
				} else {
					setIsLogin(true);
					setError("Account created! Please login.");
				}
			} else {
				setError(data.message || "Authentication failed");
			}
		} catch (err) {
			setError("Network error. Please try again.");
		}
	};

	const logout = () => {
		setToken(null);
		setUser(null);
		setTasks([]);
		localStorage.removeItem("token");
	};

	const handleTaskSubmit = async (e) => {
		e.preventDefault();
		setError("");

		const endpoint = editingTask ? `/tasks/${editingTask.id}` : "/tasks";
		const method = editingTask ? "PUT" : "POST";

		try {
			const response = await fetch(`${API_URL}${endpoint}`, {
				method,
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(taskForm),
			});

			if (response.ok) {
				await fetchTasks();
				setTaskForm({
					title: "",
					description: "",
					priority: "medium",
					due_date: "",
				});
				setEditingTask(null);
			} else {
				const data = await response.json();
				setError(data.message || "Failed to save task");
			}
		} catch (err) {
			setError("Network error. Please try again.");
		}
	};

	const deleteTask = async (taskId) => {
		try {
			const response = await fetch(`${API_URL}/tasks/${taskId}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});

			if (response.ok) {
				await fetchTasks();
			}
		} catch (err) {
			setError("Failed to delete task");
		}
	};

	const toggleComplete = async (task) => {
		try {
			const response = await fetch(`${API_URL}/tasks/${task.id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ ...task, completed: !task.completed }),
			});

			if (response.ok) {
				await fetchTasks();
			}
		} catch (err) {
			setError("Failed to update task");
		}
	};

	const startEdit = (task) => {
		setEditingTask(task);
		setTaskForm({
			title: task.title,
			description: task.description || "",
			priority: task.priority,
			due_date: task.due_date ? task.due_date.split("T")[0] : "",
			category_id: task.category_id || null,
		});
	};

	const filteredTasks = tasks.filter((task) => {
		// Filter by completion status
		let passesStatusFilter = true;
		if (filter == "active") passesStatusFilter = !task.completed;
		if (filter == "completed") passesStatusFilter = task.completed;

		// Filter by category if the category is selected
		let passesCategoryFilter = true;
		if (filter.startsWith("category-")) {
			const categoryId = parseInt(filter.split("-")[1]);
			passesCategoryFilter = task.category_id === categoryId;
		}

		// Filter by Search Query
		let passesSearchFilter = true;
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			passesSearchFilter =
				task.title.toLowerCase().includes(query) ||
				(task.description && task.description.toLowerCase().includes(query));
		}

		return passesStatusFilter && passesCategoryFilter && passesSearchFilter;
	});

	if (!token) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
				<div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
					<h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
						TaskFlow
					</h1>

					{error && (
						<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
							<AlertCircle className="w-5 h-5 mr-2" />
							{error}
						</div>
					)}

					<div className="flex mb-6 bg-gray-100 rounded-lg p-1">
						<button
							onClick={() => setIsLogin(true)}
							className={`flex-1 py-2 rounded-md transition ${isLogin ? "bg-white shadow" : ""}`}
						>
							Login
						</button>
						<button
							onClick={() => setIsLogin(false)}
							className={`flex-1 py-2 rounded-md transition ${!isLogin ? "bg-white shadow" : ""}`}
						>
							Sign Up
						</button>
					</div>

					<form onSubmit={handleAuth} className="space-y-4">
						<input
							type="text"
							placeholder="Username"
							value={formData.username}
							onChange={(e) => setFormData({ ...formData, username: e.target.value })}
							className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
							required
						/>
						{!isLogin && (
							<input
								type="email"
								placeholder="Email"
								value={formData.email}
								onChange={(e) => setFormData({ ...formData, email: e.target.value })}
								className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
								required
							/>
						)}
						<input
							type="password"
							placeholder="Password"
							value={formData.password}
							onChange={(e) => setFormData({ ...formData, password: e.target.value })}
							className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
							required
						/>
						<button
							type="submit"
							className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
						>
							{isLogin ? "Login" : "Sign Up"}
						</button>
					</form>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
			<div className="max-w-4xl mx-auto">
				<div className="bg-white rounded-lg shadow-xl p-6 mb-6">
					<div className="flex justify-between items-center mb-6">
						<h1 className="text-3xl font-bold text-gray-800">TaskFlow</h1>
						<button
							onClick={logout}
							className="flex items-center text-gray-600 hover:text-red-600 transition"
						>
							<LogOut className="w-5 h-5 mr-2" />
							Logout
						</button>
					</div>
					{/* Category Management Section */}
					<div className="mb-6 border-b pb-4">
						<div className="flex justify-between items-center mb-3">
							<h2 className="text-lg font-semibold text-gray-700">Categories</h2>
							<button
								onClick={() => setShowCategoryForm(!showCategoryForm)}
								className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded transition"
							>
								{showCategoryForm ? "Cancel" : "+ New Category"}
							</button>
						</div>

						{showCategoryForm && (
							<div className="flex gap-2 mb-3">
								<input
									type="text"
									placeholder="Category name"
									value={newCategory.name}
									onChange={(e) =>
										setNewCategory({ ...newCategory, name: e.target.value })
									}
									className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
								/>
								<input
									type="color"
									value={newCategory.color}
									onChange={(e) =>
										setNewCategory({ ...newCategory, color: e.target.value })
									}
									className="w-12 h-10 border rounded cursor-pointer"
								/>
								<button
									onClick={createCategory}
									className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
								>
									Create
								</button>
							</div>
						)}

						<div className="flex gap-2 flex-wrap">
							{categories.map((category) => (
								<div
									key={category.id}
									className="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
									style={{
										backgroundColor: category.color + "20",
										border: `1px solid ${category.color}`,
									}}
								>
									<span style={{ color: category.color }} className="font-medium">
										{category.name}
									</span>
									<button
										onClick={() => deleteCategory(category.id)}
										className="text-red-600 hover:text-red-800 ml-1"
									>
										×
									</button>
								</div>
							))}
							{categories.length === 0 && !showCategoryForm && (
								<p className="text-gray-400 text-sm">No categories yet</p>
							)}
						</div>
					</div>
					{error && (
						<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
							<AlertCircle className="w-5 h-5 mr-2" />
							{error}
						</div>
					)}

                    {/* Dashboard stats */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Statistics</h2>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-white p-3 rounded-lg shadow-sm">
                                <p className="text-sm text-gray-600">Total Tasks</p>
                                <p className="text-2xl font-bold text-gray-800">{getTaskStats().total}</p>
                            </div>
                            <div className="bg-white pg-3 rounded-lg shadow-sm">
                                <p className="text-sm text-gray-600">Completed</p>
                                <p className="text-2xl font-bold text-green-600">{getTaskStats().completed}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg shadow-sm">
                                <p className="text-sm text-gray-600">Active</p>
                                <p className="text-2xl font-bold text-blue-600">{getTaskStats().active}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg shadow-sm">
                                <p className="text-sm text-gray-600">This Week</p>
                                <p className="text-2xl font-bold text-purple-600">{getTaskStats().completedThisWeek}</p>
                            </div>
                        </div>

                        <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700 font-medium">Overall Progress</span>
                            <span className="text-gray-600">{getTaskStats().completionRate}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${getTaskStats().completionRate}%` }}
                            ></div>
                        </div>
                    </div>

                    {getTaskStats().active > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white p-2 rounded text-center border-l-4 border-red-500">
                            <p className="text-xs text-gray-600">High Priority</p>
                            <p className="text-lg font-bold text-red-600">{getTaskStats().highPriority}</p>
                        </div>
                        <div className="bg-white p-2 rounded text-center border-l-4 border-yellow-500">
                            <p className="text-xs text-gray-600">Medium Priority</p>
                            <p className="text-lg font-bold text-yellow-600">{getTaskStats().mediumPriority}</p>
                        </div>
                        <div className="bg-white p-2 rounded text-center border-l-4 border-green-500">
                            <p className="text-xs text-gray-600">Low Priority</p>
                            <p className="text-lg font-bold text-green-600">{getTaskStats().lowPriority}</p>
                        </div>
                    </div>
                    )}
                </div>

                    {/* Search bar section */}
					<div className="mb-6">
						<input
							type="text"
							placeholder="Search tasks by title or description..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full px-4 px-3 border-2 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700"
						/>
						{searchQuery && (
							<div className="mt-2 text-sm text-gray-600">
								Found {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}{" "}
								matching "{searchQuery}"
								<button
									onClick={() => setSearchQuery("")}
									className="ml-2 text-blue-600 hover:text-blue-800"
								>
									Clear
								</button>
							</div>
						)}
					</div>

					<form onSubmit={handleTaskSubmit} className="space-y-4 mb-6">
						<input
							type="text"
							placeholder="Task title"
							value={taskForm.title}
							onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
							className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
							required
						/>
						<textarea
							placeholder="Description (optional)"
							value={taskForm.description}
							onChange={(e) =>
								setTaskForm({ ...taskForm, description: e.target.value })
							}
							className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
							rows="2"
						/>
						<div className="flex gap-4">
							<select
								value={taskForm.priority}
								onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
								className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
							>
								<option value="low">Low Priority</option>
								<option value="medium">Medium Priority</option>
								<option value="high">High Priority</option>
							</select>
							<select
								value={taskForm.category_id || ""}
								onChange={(e) =>
									setTaskForm({ ...taskForm, category_id: e.target.value || null })
								}
								className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
							>
								<option value="">No Category</option>
								{categories.map((cat) => (
									<option key={cat.id} value={cat.id}>
										{cat.name}
									</option>
								))}
							</select>
							<input
								type="date"
								value={taskForm.due_date}
								onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
								className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
							/>
						</div>
						<button
							type="submit"
							className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
						>
							{editingTask ? (
								<Edit2 className="w-5 h-5 mr-2" />
							) : (
								<Plus className="w-5 h-5 mr-2" />
							)}
							{editingTask ? "Update Task" : "Add Task"}
						</button>
						{editingTask && (
							<button
								type="button"
								onClick={() => {
									setEditingTask(null);
									setTaskForm({
										title: "",
										description: "",
										priority: "medium",
										due_date: "",
									});
								}}
								className="w-full bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
							>
								Cancel
							</button>
						)}
					</form>

					<div className="mb-4">
						<div className="flex gap-2 mb-3">
							<button
								onClick={() => setFilter("all")}
								className={`px-4 py-2 rounded-lg transition ${filter === "all" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
							>
								All ({tasks.length})
							</button>
							<button
								onClick={() => setFilter("active")}
								className={`px-4 py-2 rounded-lg transition ${filter === "active" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
							>
								Active ({tasks.filter((t) => !t.completed).length})
							</button>
							<button
								onClick={() => setFilter("completed")}
								className={`px-4 py-2 rounded-lg transition ${filter === "completed" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
							>
								Completed ({tasks.filter((t) => t.completed).length})
							</button>
						</div>

						{categories.length > 0 && (
							<div className="flex gap-2 flex-wrap">
								<span className="text-sm text-gray-600 py-2">Filter by category:</span>
								{categories.map((category) => (
									<button
										key={category.id}
										onClick={() =>
											setFilter(
												filter === `category-${category.id}`
													? "all"
													: `category-${category.id}`,
											)
										}
										className={`px-3 py-1 rounded-full text-sm transition ${
											filter === `category-${category.id}`
												? "ring-2 ring-offset-1"
												: "opacity-70 hover:opacity-100"
										}`}
										style={{
											backgroundColor:
												filter === `category-${category.id}`
													? category.color
													: category.color + "40",
											color:
												filter === `category-${category.id}` ? "white" : category.color,
											borderColor: category.color,
											ringColor: category.color,
										}}
									>
										{category.name} (
										{tasks.filter((t) => t.category_id === category.id).length})
									</button>
								))}
							</div>
						)}
					</div>
					<div className="space-y-3">
						{filteredTasks.length === 0 ? (
							<p className="text-gray-500 text-center py-8">
								No tasks yet. Add one above!
							</p>
						) : (
							filteredTasks.map((task) => (
								<div
									key={task.id}
									className={`border rounded-lg p-4 transition ${task.completed ? "bg-gray-50 opacity-75" : "bg-white"}`}
								>
									<div className="flex items-start justify-between">
										<div className="flex items-start flex-1">
											<button onClick={() => toggleComplete(task)} className="mt-1 mr-3">
												{task.completed ? (
													<CheckCircle className="w-6 h-6 text-green-600" />
												) : (
													<div className="w-6 h-6 border-2 border-gray-300 rounded-full hover:border-blue-500 transition" />
												)}
											</button>
											<div className="flex-1">
												<h3
													className={`font-semibold ${task.completed ? "line-through text-gray-500" : "text-gray-800"}`}
												>
													{task.title}
												</h3>
												{task.description && (
													<p className="text-gray-600 text-sm mt-1">{task.description}</p>
												)}
												<div className="flex gap-2 mt-2">
													<span
														className={`text-xs px-2 py-1 rounded ${
															task.priority === "high"
																? "bg-red-100 text-red-700"
																: task.priority === "medium"
																	? "bg-yellow-100 text-yellow-700"
																	: "bg-green-100 text-green-700"
														}`}
													>
														{task.priority}
													</span>
													{task.due_date && (
														<span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
															Due: {new Date(task.due_date).toLocaleDateString()}
														</span>
													)}
												</div>
											</div>
										</div>
										<div className="flex gap-2 mt-2">
											<span
												className={`text-xs px-2 py-1 rounded ${
													task.priority === "high"
														? "bg-red-100 text-red-700"
														: task.priority === "medium"
															? "bg-yellow-100 text-yellow-700"
															: "bg-green-100 text-green-700"
												}`}
											>
												{task.priority}
											</span>
											{task.due_date && (
												<span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
													Due: {new Date(task.due_date).toLocaleDateString()}
												</span>
											)}
											{task.category && (
												<span
													className="text-xs px-2 py-1 rounded"
													style={{
														backgroundColor: task.category.color + "20",
														color: task.category.color,
														border: `1px solid ${task.category.color}`,
													}}
												>
													{task.category.name}
												</span>
											)}
										</div>
										<div className="flex gap-2 ml-4">
											<button
												onClick={() => startEdit(task)}
												className="text-blue-600 hover:text-blue-800 transition"
											>
												<Edit2 className="w-5 h-5" />
											</button>
											<button
												onClick={() => deleteTask(task.id)}
												className="text-red-600 hover:text-red-800 transition"
											>
												<Trash2 className="w-5 h-5" />
											</button>
										</div>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default App;
