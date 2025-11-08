<script lang="ts">
	import { goto } from '$app/navigation';
	import favicon from '$lib/assets/favicon.svg';
	import { signOut, useSession } from '$lib/auth-client';
	import '../app.css';

	let { children } = $props();
	const session = useSession();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="bg-black text-white">
	<div class="container mx-auto flex items-center justify-between gap-4 p-4">
		<nav class="flex items-center gap-4">
			<a href="/" class="font-medium">Driving Training Management System</a>
			{#if $session.data}
				{#if $session.data.user.role === 'LEARNER'}
					<a href="/instructor">Instructors</a>
				{/if}
				<a href="/training">Trainings</a>
			{/if}
		</nav>
		<div class="flex items-center gap-4">
			{#if $session.data}
				<p>{$session.data.user.name} [{$session.data.user.role[0]}]</p>
				{#if $session.data.user.role === 'INSTRUCTOR'}
					<a href="/availability">Availability</a>
				{/if}
				<button class="cursor-pointer" onclick={() => signOut().then(()=>goto('/'))}>Logout</button>
			{:else}
				<a href="/login">Login</a>
				<a href="/register">Register</a>
			{/if}
		</div>
	</div>
</header>

{@render children()}
