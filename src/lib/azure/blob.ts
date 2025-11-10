import { AZURE_STORAGE_ACCOUNT, AZURE_STORAGE_KEY, AZURE_STORAGE_URL } from '$env/static/private';
import {
	BlobSASPermissions,
	BlobServiceClient,
	generateBlobSASQueryParameters,
	StorageSharedKeyCredential,
	type BlobSASSignatureValues
} from '@azure/storage-blob';

export const getBlobServiceClient = () => BlobServiceClient.fromConnectionString(AZURE_STORAGE_URL);

export function getBlobExists(container: string, blobName: string) {
	return getBlobServiceClient().getContainerClient(container).getBlobClient(blobName).exists();
}

export function getBlobSasUri(container: string, blobName: string, permissions: string) {
	const sasOptions: BlobSASSignatureValues = {
		containerName: getBlobServiceClient().getContainerClient(container).containerName,
		blobName: blobName
	};

	sasOptions.startsOn = new Date();
	sasOptions.expiresOn = new Date(Date.now() + 3600 * 1000);
	sasOptions.permissions = BlobSASPermissions.parse(permissions);

	const sasToken = generateBlobSASQueryParameters(
		sasOptions,
		new StorageSharedKeyCredential(AZURE_STORAGE_ACCOUNT, AZURE_STORAGE_KEY)
	).toString();

	return `${getBlobServiceClient().getContainerClient(container).getBlockBlobClient(blobName).url}?${sasToken}`;
}
