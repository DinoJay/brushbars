<script lang="ts">
	import type { TimelineEntry } from '$lib/types';

	const { log } = $props<{
		log: TimelineEntry;
	}>();

	// Track active tab for this specific log
	let activeTab = $state('overview');

	function setActiveTab(tabName: string) {
		activeTab = tabName;
	}
</script>

<div
	class="rounded-xl p-6"
	style="background-color: var(--color-bg-secondary); border: 1px solid var(--color-border);"
>
	<!-- Message Details Tabs -->
	<div class="mb-6">
		<div class="border-b" style="border-color: var(--color-border);">
			<nav class="-mb-px flex space-x-8 overflow-x-auto">
				<button
					class="border-b-2 px-1 py-2 text-sm font-medium whitespace-nowrap"
					style={activeTab === 'overview'
						? 'border-color: var(--color-accent); color: var(--color-accent-dark);'
						: 'border-color: transparent; color: var(--color-text-secondary);'}
					onclick={() => setActiveTab('overview')}
				>
					Overview
				</button>
				<button
					class="border-b-2 px-1 py-2 text-sm font-medium whitespace-nowrap"
					style={activeTab === 'content'
						? 'border-color: var(--color-accent); color: var(--color-accent-dark);'
						: 'border-color: transparent; color: var(--color-text-secondary);'}
					onclick={() => setActiveTab('content')}
				>
					Content
				</button>
				<button
					class="border-b-2 px-1 py-2 text-sm font-medium whitespace-nowrap"
					style={activeTab === 'processing'
						? 'border-color: var(--color-accent); color: var(--color-accent-dark);'
						: 'border-color: transparent; color: var(--color-text-secondary);'}
					onclick={() => setActiveTab('processing')}
				>
					Processing
				</button>
				<button
					class="border-b-2 px-1 py-2 text-sm font-medium whitespace-nowrap"
					style={activeTab === 'errors'
						? 'border-color: var(--color-accent); color: var(--color-accent-dark);'
						: 'border-color: transparent; color: var(--color-text-secondary);'}
					onclick={() => setActiveTab('errors')}
				>
					Errors
				</button>
			</nav>
		</div>
	</div>

	<!-- Tab Content with Fixed Height -->
	<div class="h-64 overflow-y-auto">
		{#if activeTab === 'overview'}
			<div class="space-y-4">
				<!-- Basic Information -->
				<div>
					<h4 class="mb-2 text-sm font-medium text-gray-900">Basic Information</h4>
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-gray-500">Message ID:</span>
							<span class="ml-2 font-mono text-gray-900">{log.messageId || log.id}</span>
						</div>
						<div>
							<span class="text-gray-500">Server ID:</span>
							<span class="ml-2 font-mono text-gray-900">{log.serverId || '—'}</span>
						</div>
						<div>
							<span class="text-gray-500">Channel ID:</span>
							<span class="ml-2 font-mono text-gray-900">{log.channelId || '—'}</span>
						</div>
						<div>
							<span class="text-gray-500">Status:</span>
							<span class="ml-2 font-medium text-gray-900">{log.status || '—'}</span>
						</div>
						<div>
							<span class="text-gray-500">Processed:</span>
							<span class="ml-2 font-medium text-gray-900">{log.processed ? 'Yes' : 'No'}</span>
						</div>
						<div>
							<span class="text-gray-500">Received:</span>
							<span class="ml-2 font-mono text-gray-900"
								>{new Date(log.receivedDate || log.timestamp).toLocaleString()}</span
							>
						</div>
					</div>
				</div>

				<!-- Connector Information -->
				<div>
					<h4 class="mb-2 text-sm font-medium text-gray-900">Connector Information</h4>
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-gray-500">Connector Name:</span>
							<span class="ml-2 font-medium text-gray-900">{log.connectorName || '—'}</span>
						</div>
						<div>
							<span class="text-gray-500">Connector Type:</span>
							<span class="ml-2 font-medium text-gray-900">{log.connectorType || '—'}</span>
						</div>
						<div>
							<span class="text-gray-500">Error Code:</span>
							<span class="ml-2 font-mono text-gray-900">{log.errorCode || '—'}</span>
						</div>
						<div>
							<span class="text-gray-500">Send Attempts:</span>
							<span class="ml-2 font-medium text-gray-900">{log.sendAttempts || 0}</span>
						</div>
						<div>
							<span class="text-gray-500">Chain ID:</span>
							<span class="ml-2 font-mono text-gray-900">{log.chainId || '—'}</span>
						</div>
						<div>
							<span class="text-gray-500">Order ID:</span>
							<span class="ml-2 font-mono text-gray-900">{log.orderId || '—'}</span>
						</div>
					</div>
				</div>
			</div>
		{:else if activeTab === 'content'}
			<div class="space-y-4">
				<!-- Raw Content -->
				{#if log.rawContent}
					<div>
						<h4 class="mb-2 text-sm font-medium text-gray-900">Raw Content</h4>
						<pre
							class="overflow-x-auto rounded bg-gray-50 p-3 font-mono text-xs text-gray-800">{log.rawContent}</pre>
					</div>
				{/if}

				<!-- Transformed Content -->
				{#if log.transformedContent}
					<div>
						<h4 class="mb-2 text-sm font-medium text-gray-900">Transformed Content</h4>
						<pre
							class="overflow-x-auto rounded bg-gray-50 p-3 font-mono text-xs text-gray-800">{log.transformedContent}</pre>
					</div>
				{/if}

				<!-- Encoded Content -->
				{#if log.encodedContent}
					<div>
						<h4 class="mb-2 text-sm font-medium text-gray-900">Encoded Content</h4>
						<pre
							class="overflow-x-auto rounded bg-gray-50 p-3 font-mono text-xs text-gray-800">{log.encodedContent}</pre>
					</div>
				{/if}

				<!-- Response Content -->
				{#if log.responseContent}
					<div>
						<h4 class="mb-2 text-sm font-medium text-gray-900">Response Content</h4>
						<pre
							class="overflow-x-auto rounded bg-gray-50 p-3 font-mono text-xs text-gray-800">{log.responseContent}</pre>
					</div>
				{/if}

				{#if !log.rawContent && !log.transformedContent && !log.encodedContent && !log.responseContent}
					<div class="text-sm text-gray-500">No content available</div>
				{/if}
			</div>
		{:else if activeTab === 'processing'}
			<div class="space-y-4">
				<!-- Processing Details -->
				<div>
					<h4 class="mb-2 text-sm font-medium text-gray-900">Processing Details</h4>
					<div class="space-y-2 text-sm">
						<div>
							<span class="text-gray-500">Processing Status:</span>
							<span class="ml-2 font-medium text-gray-900"
								>{log.processed ? 'Completed' : 'Pending'}</span
							>
						</div>
						<div>
							<span class="text-gray-500">Processing Time:</span>
							<span class="ml-2 font-medium text-gray-900">{log.processingTime || '—'}</span>
						</div>
					</div>
				</div>

				<!-- Metadata -->
				{#if log.metaDataMap}
					<div>
						<h4 class="mb-2 text-sm font-medium text-gray-900">Metadata</h4>
						<pre
							class="overflow-x-auto rounded bg-gray-50 p-3 font-mono text-xs text-gray-800">{log.metaDataMap}</pre>
					</div>
				{/if}
			</div>
		{:else if activeTab === 'errors'}
			<div class="space-y-4">
				<!-- Processing Errors -->
				{#if log.processingErrorContent}
					<div>
						<h4 class="mb-2 text-sm font-medium text-red-900">Processing Error</h4>
						<pre
							class="overflow-x-auto rounded bg-red-50 p-3 font-mono text-xs text-red-800">{log.processingErrorContent}</pre>
					</div>
				{/if}

				<!-- Post-Processor Errors -->
				{#if log.postProcessorErrorContent}
					<div>
						<h4 class="mb-2 text-sm font-medium text-red-900">Post-Processor Error</h4>
						<pre
							class="overflow-x-auto rounded bg-red-50 p-3 font-mono text-xs text-red-800">{log.postProcessorErrorContent}</pre>
					</div>
				{/if}

				<!-- Response Errors -->
				{#if log.responseErrorContent}
					<div>
						<h4 class="mb-2 text-sm font-medium text-red-900">Response Error</h4>
						<pre
							class="overflow-x-auto rounded bg-red-50 p-3 font-mono text-xs text-red-800">{log.responseErrorContent}</pre>
					</div>
				{/if}

				{#if !log.processingErrorContent && !log.postProcessorErrorContent && !log.responseErrorContent}
					<div class="text-sm text-gray-500">No errors recorded</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
