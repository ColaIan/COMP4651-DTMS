<script lang="ts">
	import { useSession } from '$lib/auth-client';
	import { WebPubSubClient } from '@azure/web-pubsub-client';
	import { getContext, onMount } from 'svelte';
	import { Temporal } from 'temporal-polyfill';
	import ScoreSheet from './ScoreSheet.svelte';

	const props = $props();
	const session = getContext<ReturnType<typeof useSession>>('session');
	const scoreSheets = $state(props.data.training.scoreSheets);

	onMount(() => {
		const client = new WebPubSubClient(props.data.trainingPubSubUrl);
		client.on('group-message', (message) => {
			const data = message.message.data as { type: string; [key: string]: any };
			switch (data.type as string) {
				case 'addScoreSheet':
					scoreSheets.push({
						id: data.scoreSheetId,
						data: data.data
					});
					break;
				case 'updateScoreSheet':
					const scoreSheet = scoreSheets.find((s: { id: string }) => s.id === data.scoreSheetId);
					if (scoreSheet) scoreSheet.data = data.data;
					break;
				case 'deleteScoreSheet':
					const index = scoreSheets.findIndex((s: { id: string }) => s.id === data.scoreSheetId);
					if (index !== -1) scoreSheets.splice(index, 1);
					break;
			}
		});
		client.start();

		return () => {
			client.stop();
		};
	});
</script>

<div class="container mx-auto p-4">
	<h1 class="mb-4 text-2xl font-bold">Training Details</h1>
	<div class="md:grid md:grid-cols-4">
		<div class="mb-4">
			<h2 class="text-xl font-semibold">Instructor</h2>
			<p>{props.data.training.instructor.user.name}</p>
		</div>
		<div class="mb-4">
			<h2 class="text-xl font-semibold">Learner</h2>
			<p>{props.data.training.learner.user.name}</p>
		</div>
		<div class="mb-4 md:col-span-2">
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
	</div>
	<div class="mb-4">
		<h2 class="text-xl font-semibold">License</h2>
		<p>
			{props.data.training.learner.licenseNumber} ({props.data.training.learner.licenseExpiry
				.toISOString()
				.split('T')[0]
				})
		</p>
		{#if props.data.training.learner.licenseUrl}
			<img src={props.data.training.learner.licenseUrl} alt="license" class="max-h-xl max-w-full" />
		{/if}
	</div>

	<div class="mb-4">
		<h2 class="mb-2 text-xl font-semibold">
			Score Sheets
			{#if $session.data?.user.role === 'INSTRUCTOR'}
				<form method="POST" action="?/addScoreSheet" class="inline-block cursor-pointer text-base">
					<button type="submit" class="text-green-600 underline hover:no-underline">Add</button>
				</form>
			{/if}
		</h2>
		{#if scoreSheets.length}
			{#each scoreSheets as scoreSheet, i}
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
					<ScoreSheet {scoreSheet} editable={$session.data?.user.role === 'INSTRUCTOR'} />
				</div>
			{/each}
		{:else}
			<p>No score sheets available.</p>
		{/if}
	</div>
</div>
