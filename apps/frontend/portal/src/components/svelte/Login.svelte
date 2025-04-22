<script>
  let masterPassword = ''
</script>

<form method="POST" action="/auth" class="login-form">
  <h2 class="title">Enter Master Password</h2>

  <label for="password">Password</label>
  <input
    id="password"
    name="password"
    type="password"
    bind:value={masterPassword}
    placeholder="••••••••"
    required
  />

  <button type="submit">Login</button>
</form>

<style>
  .login-form {
    display: flex;
    flex-direction: column;
    gap: var(--size-3);
    max-width: 24rem;
    background: var(--surface-1);
    border-radius: var(--radius-3);
    box-shadow: var(--shadow-3);
    font-family: var(--font-sans);
    color: var(--text-1);
  }

  .title {
    font-size: var(--font-size-3);
    font-weight: var(--font-weight-7);
    text-align: center;
    margin-bottom: var(--size-2);
  }

  input {
    font-size: var(--font-size-1);
    border: 1px solid var(--surface-3);
    border-radius: var(--radius-2);
    background: var(--surface-2);
    color: var(--text-1);
  }

  input:focus {
    outline: none;
    border-color: var(--blue-6);
    box-shadow: 0 0 0 2px var(--blue-3);
  }

  button {
    font-size: var(--font-size-1);
    font-weight: var(--font-weight-6);
    color: white;
    background-color: var(--blue-6);
    border: none;
    border-radius: var(--radius-2);
    cursor: pointer;
    transition: background 0.2s ease;
  }

  button:hover {
    background-color: var(--blue-7);
  }

  label {
    font-size: var(--font-size-0);
  }
</style>
