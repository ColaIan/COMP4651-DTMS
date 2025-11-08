<script lang="ts">
	const props = $props();
</script>

<div class="container mx-auto p-4">
	<h1 class="mb-4 text-2xl font-bold">Instructors</h1>
	{#if props.data.instructors.length}
		<ul>
			{#each props.data.instructors as instructor}
				<li class="border-b border-gray-300 py-2">
					<p>{instructor.name}</p>
					<a href="/instructor/{instructor.id}" class="text-blue-500 underline hover:no-underline"
						>View Availabilities</a
					>
				</li>
			{/each}
		</ul>
	{:else}
		<p>No instructors found.</p>
	{/if}
</div>
