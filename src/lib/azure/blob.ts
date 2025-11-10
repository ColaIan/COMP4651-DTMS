import { env } from "$env/dynamic/private";
import { BlobSASPermissions, BlobServiceClient, generateBlobSASQueryParameters, StorageSharedKeyCredential, type BlobSASSignatureValues } from "@azure/storage-blob";

export const blobServiceClient = BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_URL);

export function getBlobExists(container: string, blobName: string) {
    return blobServiceClient.getContainerClient(container).getBlobClient(blobName).exists();
}

export function getBlobSasUri(container: string, blobName: string, permissions: string) {
    const sasOptions: BlobSASSignatureValues = {
        containerName: blobServiceClient.getContainerClient(container).containerName,
        blobName: blobName
    };

    sasOptions.startsOn = new Date();
    sasOptions.expiresOn = new Date(Date.now() + 3600 * 1000);
    sasOptions.permissions = BlobSASPermissions.parse(permissions);

    const sasToken = generateBlobSASQueryParameters(sasOptions, new StorageSharedKeyCredential(env.AZURE_STORAGE_ACCOUNT, env.AZURE_STORAGE_KEY)).toString();
    console.log(`SAS token for blob is: ${sasToken}`);

    return `${blobServiceClient.getContainerClient(container).getBlockBlobClient(blobName).url}?${sasToken}`;
}