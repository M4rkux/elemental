<script lang="ts">
	import './layout.css';
	import '$lib/styles/theme.scss';
	import favicon from '$lib/assets/favicon.svg';
	import Aurora from '$lib/components/Aurora.svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<Aurora />
<div class="app-shell">
	{@render children()}
</div>

<style>
	.app-shell {
		position: relative;
		z-index: 1;
		min-height: 100vh;
	}
</style>
