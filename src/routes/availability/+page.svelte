<script lang="ts">
	import { Temporal } from 'temporal-polyfill';

	const props = $props();
	let startTime = $state(Temporal.Now.zonedDateTimeISO().toString().slice(0, 16));
	let endTime = $state(Temporal.Now.zonedDateTimeISO().toString().slice(0, 16));
</script>

<div class="container mx-auto p-4">
	<h1 class="mb-4 text-2xl font-bold">Instructor Availability</h1>
	<!-- TODO: Use a better calendar https://github.com/vkurko/calendar -->
	<form method="POST" action="?/create" class="mb-6">
		<div class="mb-4">
			<label for="startTime" class="block font-medium">Start Time:</label>
			<input
				type="datetime-local"
				id="startTime"
				name="startTimeLocal"
				required
				class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
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
			<label for="endTime" class="block font-medium">End Time:</label>
			<input
				type="datetime-local"
				id="endTime"
				name="endTimeLocal"
				required
				class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
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
		<button type="submit" class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
			>Add Availability</button
		>
	</form>

	{#if props.data.availabilities.length}
		<table class="w-full table-auto border-collapse border border-gray-300">
			<thead>
				<tr class="bg-gray-200">
					<th class="border border-gray-300 px-4 py-2">Start Time</th>
					<th class="border border-gray-300 px-4 py-2">End Time</th>
					<th class="border border-gray-300 px-4 py-2">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each props.data.availabilities as availability}
					<tr>
						<td class="border border-gray-300 px-4 py-2"
							>{new Date(availability.startTime).toLocaleString()}</td
						>
						<td class="border border-gray-300 px-4 py-2"
							>{new Date(availability.endTime).toLocaleString()}</td
						>
						<td class="border border-gray-300 px-4 py-2"
							><form method="POST" action="?/delete">
								<input type="hidden" name="id" value={availability.id} /><button
									class="cursor-pointer text-red-800">Delete</button
								>
							</form></td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<p>No availability slots found.</p>
	{/if}
</div>
