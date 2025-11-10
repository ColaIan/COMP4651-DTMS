<script lang="ts">
	import { Temporal } from 'temporal-polyfill';

	const props = $props();
	let startTime = $state(Temporal.Now.zonedDateTimeISO().toString().slice(0, 16));
	let endTime = $state(Temporal.Now.zonedDateTimeISO().toString().slice(0, 16));
</script>

<div class="container mx-auto p-4">
	<h1 class="mb-4 text-2xl font-bold">{props.data.instructor.name}</h1>
	<!-- TODO: Use a better calendar https://github.com/vkurko/calendar -->
	<form method="POST" action="?/requestTraining" class="mb-8">
		<div class="mb-4">
			<label for="startTime" class="block text-sm font-medium text-gray-700">Start Time</label>
			<input
				type="datetime-local"
				id="startTime"
				name="startTimeLocal"
				required
				class="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm"
				bind:value={startTime}
			/>
			<input
				type="hidden"
				name="startTime"
				value={Temporal.Instant.from(
					Temporal.PlainDateTime.from(startTime)
						.toZonedDateTime(Temporal.Now.timeZoneId())
						.toString()
				)}
			/>
		</div>
		<div class="mb-4">
			<label for="endTime" class="block text-sm font-medium text-gray-700">End Time</label>
			<input
				type="datetime-local"
				id="endTime"
				name="endTimeLocal"
				required
				class="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm"
				bind:value={endTime}
			/>
			<input
				type="hidden"
				name="endTime"
				value={Temporal.Instant.from(
					Temporal.PlainDateTime.from(endTime).toZonedDateTime(Temporal.Now.timeZoneId()).toString()
				)}
			/>
		</div>
		<button type="submit" class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
			>Request Training</button
		>
	</form>
	<h2 class="mb-4 text-xl font-bold">Availability</h2>
	<table class="min-w-full border border-gray-300">
		<thead>
			<tr class="bg-gray-100">
				<th class="border border-gray-300 px-4 py-2">Start Time</th>
				<th class="border border-gray-300 px-4 py-2">End Time</th>
			</tr>
		</thead>
		<tbody>
			{#each props.data.instructor.instructor.instructorAvailabilities as availability}
				<tr>
					<td class="border border-gray-300 px-4 py-2"
						>{new Date(availability.startTime).toLocaleString()}</td
					>
					<td class="border border-gray-300 px-4 py-2"
						>{new Date(availability.endTime).toLocaleString()}</td
					>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
