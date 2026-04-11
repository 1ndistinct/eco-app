import { FormEvent, useEffect, useMemo, useState } from "react";

type Todo = {
  id: string;
  title: string;
  completed: boolean;
};

type TodoListResponse = {
  items: Todo[];
};

type ApiError = {
  error?: string;
};

const TODO_ENDPOINT = "/api/todos";

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as ApiError;
    if (typeof data.error === "string" && data.error.trim() !== "") {
      return data.error;
    }
  } catch {
    // Ignore JSON parsing failures and fall back to the provided message.
  }

  return fallback;
}

export function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTodos() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(TODO_ENDPOINT);
        if (!response.ok) {
          throw new Error(await readErrorMessage(response, "Unable to load todos."));
        }

        const data = (await response.json()) as Partial<TodoListResponse>;
        if (isMounted) {
          setTodos(Array.isArray(data.items) ? data.items : []);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : "Unable to load todos.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTodos();

    return () => {
      isMounted = false;
    };
  }, []);

  const remainingCount = useMemo(
    () => todos.filter((todo) => !todo.completed).length,
    [todos],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (trimmedTitle === "") {
      setSubmitError("Title is required");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(TODO_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: trimmedTitle }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to create todo."));
      }

      const createdTodo = (await response.json()) as Todo;
      setTodos((currentTodos) => [...currentTodos, createdTodo]);
      setTitle("");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create todo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main>
      <section aria-labelledby="todo-heading">
        <h1 id="todo-heading">Todo list</h1>
        <p>Track work with the validated Todo API contract.</p>

        <form onSubmit={handleSubmit} aria-label="Create a todo">
          <label htmlFor="todo-title">New todo</label>
          <input
            id="todo-title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs doing?"
            disabled={isSubmitting}
          />
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding…" : "Add todo"}
          </button>
        </form>

        {submitError ? <p role="alert">{submitError}</p> : null}
        {loadError ? <p role="alert">{loadError}</p> : null}

        {isLoading ? <p>Loading todos…</p> : null}

        {!isLoading && !loadError ? (
          <>
            <p>{remainingCount} items remaining</p>
            {todos.length === 0 ? (
              <p>No todos yet. Add your first item above.</p>
            ) : (
              <ul aria-label="Todo items">
                {todos.map((todo) => (
                  <li key={todo.id}>
                    <span>{todo.title}</span>
                    {todo.completed ? <span>Completed</span> : <span>Open</span>}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}

export default App;
