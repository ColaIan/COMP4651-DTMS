<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import { z } from 'zod';
	import { category, items, serious } from './scoresheet';

	const props = $props();
	const ScoreSheetData = z.object({
		partB: z
			.object({
				minor: z.array(z.number()),
				serious: z.array(z.number())
			})
			.default({ minor: [], serious: [] }),
		partC: z
			.object({
				minor: z.array(z.number()),
				serious: z.array(z.number())
			})
			.default({ minor: [], serious: [] }),
		remarks: z.string().default('')
	});
	const scoreSheet = $state(props.scoreSheet);
	scoreSheet.data = ScoreSheetData.parse(scoreSheet.data);

	let form: HTMLFormElement;
	const submitForm = async () => {
		await tick();
		form?.submit();
	};
</script>

<form
	bind:this={form}
	method="POST"
	action="?/updateScoreSheet"
	use:enhance={() => {
		return async ({ update }) => {
			await update();
		};
	}}
>
	<input type="hidden" name="scoreSheetId" value={scoreSheet.id} />
	<input type="hidden" name="data" value={JSON.stringify(scoreSheet.data)} />
</form>
{#snippet deductionItem(itemNo: number, partB: boolean, partC: boolean)}
	{#if category[itemNo]}
		{@const catName = category[itemNo].split('\n', 2)}
		<tr class="text-center font-medium">
			{#if partB}
				{#if [1, 20, 56].includes(itemNo)}
					<td class="p-1 text-xs">Minor</td>
					<td class="p-1 text-xs">Serious</td>
				{:else}
					<td colspan="2"></td>
				{/if}
			{/if}
			<td class="w-full border-b-3 pt-2 pb-px text-sm leading-3">
				{catName[0]}
				{#if catName.length === 2}
					<br />
					<span class="text-[0.6rem]">{catName[1]}</span>
				{/if}
			</td>
			{#if partC}
				{#if [1, 20, 56].includes(itemNo)}
					<td class="p-1 text-xs">Minor</td>
					<td class="p-1 text-xs">Serious</td>
				{:else}
					<td colspan="2"></td>
				{/if}
			{/if}
		</tr>
	{/if}
	<tr>
		{#if partB}
			<td class="text-center">
				{#if !serious.includes(itemNo) && itemNo !== 50}
					<button
						class="h-3.5 w-4.5 cursor-pointer rounded-[3px] border disabled:cursor-default"
						class:bg-black={scoreSheet.data.partB.minor.includes(itemNo)}
						onclick={() => {
							scoreSheet.data.partB.minor.includes(itemNo)
								? scoreSheet.data.partB.minor.splice(scoreSheet.data.partB.minor.indexOf(itemNo), 1)
								: scoreSheet.data.partB.minor.push(itemNo);
							submitForm();
						}}
						disabled={!props.editable}
						title="Minor Mistake"
					></button>
				{/if}
			</td>
			<td class="text-center">
				{#if itemNo !== 50}
					<button
						class="h-3.5 w-4.5 cursor-pointer rounded-[3px] border disabled:cursor-default"
						class:bg-black={scoreSheet.data.partB.serious?.includes(itemNo)}
						onclick={() => {
							scoreSheet.data.partB.serious?.includes(itemNo)
								? scoreSheet.data.partB.serious?.splice(
										scoreSheet.data.partB.serious?.indexOf(itemNo),
										1
									)
								: scoreSheet.data.partB.serious?.push(itemNo);
							submitForm();
						}}
						disabled={!props.editable}
						title="Serious Mistake"
					>
					</button>
				{/if}
			</td>
		{/if}
		<td class="border-b leading-5">{itemNo}. {items[itemNo - 1]}</td>
		{#if partC}
			<td class="text-center">
				{#if !serious.includes(itemNo)}
					<button
						class="h-3.5 w-4.5 cursor-pointer rounded-[3px] border disabled:cursor-default"
						class:bg-black={scoreSheet.data.partC.minor.includes(itemNo)}
						onclick={() => {
							scoreSheet.data.partC.minor.includes(itemNo)
								? scoreSheet.data.partC.minor.splice(scoreSheet.data.partC.minor.indexOf(itemNo), 1)
								: scoreSheet.data.partC.minor.push(itemNo);
							submitForm();
						}}
						disabled={!props.editable}
						title="Minor Mistake"
					></button>
				{/if}
			</td>
			<td class="text-center">
				<button
					class="h-3.5 w-4.5 cursor-pointer rounded-[3px] border disabled:cursor-default"
					class:bg-black={scoreSheet.data.partC.serious?.includes(itemNo)}
					onclick={() => {
						scoreSheet.data.partC.serious?.includes(itemNo)
							? scoreSheet.data.partC.serious?.splice(
									scoreSheet.data.partC.serious?.indexOf(itemNo),
									1
								)
							: scoreSheet.data.partC.serious?.push(itemNo);
						submitForm();
					}}
					disabled={!props.editable}
					title="Serious Mistake"
				>
				</button>
			</td>
		{/if}
	</tr>
{/snippet}
<div class="flex border-y">
	<div class="w-3/10 border-r">
		<table>
			<thead>
				<tr>
					<th colspan="2" class="text-xs">Mistake</th>
				</tr>
			</thead>
			<tbody>
				{#each Array(19)
					.fill(0)
					.map((_, i) => i + 1) as itemNo}
					{@render deductionItem(itemNo, true, false)}
				{/each}
			</tbody>
		</table>
		<div class="mt-4 border-t pl-1">
			<div class="px-1">
				<p class="mb-1 text-sm font-medium">Remarks:</p>
				<textarea
					class="w-full border-none p-0"
					rows="8"
					bind:value={scoreSheet.data.remarks}
					onblur={() => {
						submitForm();
					}}
					disabled={!props.editable}
				></textarea>
			</div>
		</div>
	</div>
	<div class="w-4/10">
		<table>
			<thead>
				<tr>
					<th colspan="2" class="text-xs">Mistake</th>
					<th></th>
					<th colspan="2" class="text-xs">Mistake</th>
				</tr>
			</thead>
			<tbody>
				{#each Array(36)
					.fill(0)
					.map((_, i) => i + 20) as itemNo}
					{@render deductionItem(itemNo, true, true)}
				{/each}
			</tbody>
		</table>
	</div>
	<div class="w-3/10 border-l">
		<table>
			<thead>
				<tr>
					<th></th>
					<th colspan="2" class="text-xs">Mistake</th>
				</tr>
			</thead>
			<tbody>
				{#each Array(18)
					.fill(0)
					.map((_, i) => i + 56) as itemNo}
					{@render deductionItem(itemNo, false, true)}
				{/each}
			</tbody>
		</table>
	</div>
</div>
