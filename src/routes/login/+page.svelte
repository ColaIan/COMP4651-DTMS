<script lang="ts">
	import { goto } from '$app/navigation';
	import { signIn } from '$lib/auth-client';
</script>

<div class="container mx-auto p-4">
	<h1 class="text-2xl font-bold">Driving Training Management System Login</h1>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			const formData = new FormData(e.currentTarget);
			const email = formData.get('email') as string;
			const password = formData.get('password') as string;

			signIn
				.email(
					{ email, password },
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
		<div class="mt-6">
			<button type="submit" class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
				>Login</button
			>
		</div>
	</form>
</div>
