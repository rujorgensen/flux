<script lang="ts">
  let clicked = false;

  function handleClick() {
    clicked = !clicked;
  }
</script>

<button 
  on:click={handleClick}
  class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 shadow-md hover:shadow-lg"
>
  {clicked ? "Clicked!" : "Click me"}
</button>

{#if clicked}
  <p class="mt-2 text-green-600 font-semibold">
    TailwindCSS is working! 🎉
  </p>
{/if}