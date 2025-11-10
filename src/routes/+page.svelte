<script lang="ts">
	import { useSession } from '$lib/auth-client';
	import { getContext } from 'svelte';

	const session = getContext<ReturnType<typeof useSession>>('session');
</script>

<div class="container mx-auto p-4">
	<h1 class="text-2xl font-bold">Welcome to Driving Training Management System</h1>
	{#if $session.data}
		<p class="mt-2">
			You are logged in as <strong>{$session.data.user.name}</strong> [{$session.data.user
				.role[0]}].
		</p>
		{#if $session.data.user.role === 'INSTRUCTOR'}
			<p class="mt-2">
				View your <a href="/training" class="underline hover:no-underline">upcoming trainings</a>.
			</p>
		{:else if $session.data.user.role === 'LEARNER'}
			<p class="mt-2">
				You may <a href="/instructor" class="underline hover:no-underline">create booking</a> or
				<a href="/training" class="underline hover:no-underline">view training sessions</a>.
			</p>
		{/if}
	{:else}
		<p class="mt-2">
			Please <a href="/login" class="underline hover:no-underline">login</a> or
			<a href="/register" class="underline hover:no-underline">register</a>.
		</p>
	{/if}
</div>
