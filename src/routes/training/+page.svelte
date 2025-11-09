<script lang="ts">
    const props = $props();
</script>

<div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Upcoming Trainings</h1>
    {#if props.data.trainings.length}
        <table class="w-full table-auto border-collapse border border-gray-300">
            <thead>
                <tr class="bg-gray-200">
                    <th class="border border-gray-300 px-4 py-2">Instructor</th>
                    <th class="border border-gray-300 px-4 py-2">Learner</th>
                    <th class="border border-gray-300 px-4 py-2">Start Time</th>
                    <th class="border border-gray-300 px-4 py-2">End Time</th>
                    <th class="border border-gray-300 px-4 py-2">Status</th>
                    <th class="border border-gray-300 px-4 py-2">Actions</th>
                </tr>
            </thead>
            <tbody>
                {#each props.data.trainings as training}
                    <tr>
                        <td class="border border-gray-300 px-4 py-2">{training.instructor.user.name}</td>
                        <td class="border border-gray-300 px-4 py-2">{training.learner.user.name}</td>
                        <td class="border border-gray-300 px-4 py-2">{new Date(training.startTime).toLocaleString()}</td>
                        <td class="border border-gray-300 px-4 py-2">{new Date(training.endTime).toLocaleString()}</td>
                        <td class="border border-gray-300 px-4 py-2">{training.status}</td>
                        <td class="border border-gray-300 px-4 py-2">
                            <a href="/training/{training.id}" class="text-blue-500 underline hover:no-underline">View</a>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {:else}
        <p>No upcoming trainings found.</p>
    {/if}
</div>