<script lang="ts">
	import { enhance } from "$app/forms";


	const props = $props();
	const scoreSheet = $state(props.scoreSheet);
	scoreSheet.data.minor = scoreSheet.data.minor || [];
	scoreSheet.data.serious = scoreSheet.data.serious || [];

    let form: HTMLFormElement;
    const submitForm = ()=>{
        setTimeout(()=>{
            form?.submit();
        },0);
    }
</script>

<form bind:this={form} method="POST" action="?/updateScoreSheet" use:enhance>
    <input type="hidden" name="scoreSheetId" value={scoreSheet.id} />
    <input type="hidden" name="data" value={JSON.stringify(scoreSheet.data)} />
</form>
<div class="flex border-y">
	<div class="w-3/10 border-r">
		<table>
			<thead
				><tr><th colspan="2" class="text-xs">Mistake</th></tr><tr
					><th class="p-1 text-xs">Minor</th><th class="p-1 text-xs">Serious</th><th
						class="w-full border-b-3 leading-3"
						>STOP ON SLOPE<br /><span class="text-xs"
							>( Not Applicable To Motor Cycle part B Test )</span
						></th
					></tr
				></thead
			>
			<tbody>
				<tr
					><td class="text-center"
						><button
							class="h-3.5 w-5 cursor-pointer disabled:cursor-default rounded-[3px] border"
							class:bg-black={scoreSheet.data.minor.includes(1)}
							onclick={() =>
								{scoreSheet.data.minor.includes(1)
									? scoreSheet.data.minor.splice(scoreSheet.data.minor.indexOf(1), 1)
									: scoreSheet.data.minor.push(1); submitForm()}}
							disabled={!props.editable}
                            title="Minor Mistake"
						></button></td
					><td class="text-center"
						><button
							class="h-3.5 w-5 cursor-pointer disabled:cursor-default rounded-[3px] border"
							class:bg-black={scoreSheet.data.serious?.includes(1)}
							onclick={() =>
								{scoreSheet.data.serious?.includes(1)
									? scoreSheet.data.serious?.splice(scoreSheet.data.serious?.indexOf(1), 1)
									: scoreSheet.data.serious?.push(1); submitForm()}}
							disabled={!props.editable}
						title="Serious Mistake"
						></button></td
					><td class="border-b leading-5">1. Fail to check traffic conditions</td></tr
				>
				<tr
					><td class="text-center"
						><button
							class="h-3.5 w-5 cursor-pointer disabled:cursor-default rounded-[3px] border"
							class:bg-black={scoreSheet.data.minor.includes(2)}
							onclick={() =>
								{scoreSheet.data.minor.includes(2)
									? scoreSheet.data.minor.splice(scoreSheet.data.minor.indexOf(2), 1)
									: scoreSheet.data.minor.push(2); submitForm()}}
							disabled={!props.editable}
						title="Minor Mistake"
						></button></td
					><td class="text-center"
						><button
							class="h-3.5 w-5 cursor-pointer disabled:cursor-default rounded-[3px] border"
							class:bg-black={scoreSheet.data.serious?.includes(2)}
							onclick={() =>
								{scoreSheet.data.serious?.includes(2)
									? scoreSheet.data.serious?.splice(scoreSheet.data.serious?.indexOf(2), 1)
									: scoreSheet.data.serious?.push(2); submitForm()}}
							disabled={!props.editable}
						title="Serious Mistake"
						></button></td
					><td class="border-b leading-5">2. Roll backwards</td></tr
				>
				<tr
					><td class="text-center"
						><button
							class="h-3.5 w-5 cursor-pointer disabled:cursor-default rounded-[3px] border"
							class:bg-black={scoreSheet.data.minor.includes(3)}
							onclick={() =>
								{scoreSheet.data.minor.includes(3)
									? scoreSheet.data.minor.splice(scoreSheet.data.minor.indexOf(3), 1)
									: scoreSheet.data.minor.push(3); submitForm()}}
							disabled={!props.editable}
						title="Minor Mistake"
						></button></td
					><td class="text-center"
						><button
							class="h-3.5 w-5 cursor-pointer disabled:cursor-default rounded-[3px] border"
							class:bg-black={scoreSheet.data.serious?.includes(3)}
							onclick={() =>
								{scoreSheet.data.serious?.includes(3)
									? scoreSheet.data.serious?.splice(scoreSheet.data.serious?.indexOf(3), 1)
									: scoreSheet.data.serious?.push(3); submitForm()}}
							disabled={!props.editable}
						title="Serious Mistake"
						></button></td
					><td class="border-b leading-5">3. Stop in improper position</td></tr
				>
			</tbody>
		</table>
	</div>
	<div class="w-4/10"></div>
	<div class="w-3/10 border-l"></div>
</div>
