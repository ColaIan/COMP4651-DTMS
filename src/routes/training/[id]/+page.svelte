<script lang="ts">
	import { useSession } from '$lib/auth-client';
	import { Temporal } from 'temporal-polyfill';
	import ScoreSheet from './ScoreSheet.svelte';

	const props = $props();
	const session = useSession();
</script>

<div class="container mx-auto p-4">
	<h1 class="mb-4 text-2xl font-bold">Training Details</h1>
	<div class="mb-4">
		<h2 class="text-xl font-semibold">Instructor</h2>
		<p>{props.data.training.instructor.user.name}</p>
	</div>
	<div class="mb-4">
		<h2 class="text-xl font-semibold">Learner</h2>
		<p>{props.data.training.learner.user.name}</p>
	</div>
	<div class="mb-4">
		<h2 class="text-xl font-semibold">Time</h2>
		<p>
			{Temporal.Instant.from(props.data.training.startTime.toISOString())
				.toZonedDateTimeISO(Temporal.Now.timeZoneId())
				.toPlainDateTime()
				.toString()
				.replace('T', ' ')} - {Temporal.Instant.from(props.data.training.endTime.toISOString())
				.toZonedDateTimeISO(Temporal.Now.timeZoneId())
				.toPlainDateTime()
				.toString()
				.replace('T', ' ')}
		</p>
	</div>
	<div class="mb-4">
		<h2 class="mb-4 text-xl font-semibold">
			Score Sheets
			{#if $session.data?.user.role === 'INSTRUCTOR'}
				<form
					method="POST"
					action="?/addScoreSheet"
					class="inline-block cursor-pointer text-base"
				>
					<button type="submit" class="text-green-600 underline hover:no-underline">Add</button>
				</form>
			{/if}
		</h2>
		{#if props.data.training.scoreSheets.length}
			{#each props.data.training.scoreSheets as scoreSheet, i}
				<div class="mb-2 border p-2">
					<h3 class="font-semibold">
						Score Sheet #{i + 1}
						{#if $session.data?.user.role === 'INSTRUCTOR'}
							<form
								method="POST"
								action="?/deleteScoreSheet"
								class="inline-block cursor-pointer text-base"
							>
								<input type="hidden" name="scoreSheetId" value={scoreSheet.id} />
								<button type="submit" class="text-red-600 underline hover:no-underline"
									>Delete</button
								>
							</form>
						{/if}
					</h3>
					<ScoreSheet {scoreSheet} />
				</div>
			{/each}
		{:else}
			<p>No score sheets available.</p>
		{/if}
	</div>
</div>
