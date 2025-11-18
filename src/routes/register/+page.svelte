<script lang="ts">
	import { goto } from '$app/navigation';
	import { signUp } from '$lib/auth-client';
	let role = $state('LEARNER');
</script>

<div class="container mx-auto p-4">
	<h1 class="text-2xl font-bold">Driving Training Management System Register</h1>
	<form
		onsubmit={async (e) => {
			e.preventDefault();
			const formData = new FormData(e.currentTarget);
			const name = formData.get('name') as string;
			const email = formData.get('email') as string;
			const password = formData.get('password') as string;
			const role = formData.get('role') as string;
			const licenseNumber = formData.get('licenseNumber') as string;
			const licenseExpiry = formData.get('licenseExpiry') as string;
			const licenseFile = formData.get('licenseFile') as File;

			const readFile = () =>
				new Promise<string | null>((resolve) => {
					if (role === 'LEARNER' && licenseFile instanceof File) {
						const reader = new FileReader();
						reader.onload = (event) => {
							const licenseFileData = event.target!.result as string;
							resolve(licenseFileData);
						};
						reader.readAsDataURL(licenseFile);
					} else {
						resolve(null);
					}
				});

			signUp
				.email(
					{
						email,
						password,
						name,
						role,
						...(role === 'LEARNER' && {
							licenseNumber,
							licenseExpiry: new Date(licenseExpiry),
							licenseFile: await readFile()
						})
					},
					{
						throw: true
					}
				)
				.then(() => {
					goto('/');
				})
				.catch((e) => {
					alert(e.error?.message ? e.error.message : e.message);
				});
		}}
	>
		<div class="mt-4">
			<label for="name" class="block font-medium">Name:</label>
			<input
				id="name"
				name="name"
				required
				class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
			/>
		</div>
		<div class="mt-4">
			<label for="email" class="block font-medium">Email:</label>
			<input
				type="email"
				id="email"
				name="email"
				required
				class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
			/>
		</div>
		<div class="mt-4">
			<label for="password" class="block font-medium">Password:</label>
			<input
				type="password"
				id="password"
				name="password"
				required
				class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
			/>
		</div>
		<div class="mt-4">
			<p class="block font-medium">Role:</p>
			<div class="mt-1 flex w-full gap-4 rounded border border-gray-300 px-3 py-2">
				<label>
					<input type="radio" name="role" value="LEARNER" bind:group={role} />
					Learner
				</label>
				<label>
					<input type="radio" name="role" value="INSTRUCTOR" bind:group={role} />
					Instructor
				</label>
			</div>
		</div>
		{#if role === 'LEARNER'}
			<div class="mt-4">
				<label for="licenseFile" class="block font-medium">License Photo:</label>
				<input
					type="file"
					accept="image/png"
					size={1024 * 1024}
					multiple={false}
					id="licenseFile"
					name="licenseFile"
					required
					class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
				/>
			</div>
			<div class="mt-4">
				<label for="licenseNumber" class="block font-medium">License Number:</label>
				<input
					id="licenseNumber"
					name="licenseNumber"
					required
					class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
				/>
			</div>
			<div class="mt-4">
				<label for="licenseExpiry" class="block font-medium">License Expiry Date:</label>
				<input
					type="date"
					id="licenseExpiry"
					name="licenseExpiry"
					required
					class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
				/>
			</div>
		{/if}
		<div class="mt-6">
			<button type="submit" class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 cursor-pointer"
				>Register</button
			>
		</div>
	</form>
</div>
