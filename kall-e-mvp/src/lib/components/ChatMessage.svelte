<script lang="ts">
    import type { ChatCompletionRequestMessageRoleEnum } from 'openai'
    
    export let type: ChatCompletionRequestMessageRoleEnum
    export let message: string
    
    $: avatarName = type === 'user' ? 'Me' : 'Bot';
    $: avatarUrl = `https://ui-avatars.com/api/?name=${avatarName}`;
    $: chatAlignment = type === 'user' ? 'chat-end' : 'chat-start';
    $: chatBubbleStyle = type === 'user' ? 'chat-bubble-primary' : 'chat-bubble-secondary';
</script>

<div class="chat {chatAlignment} justify-end">
    <div class="chat-image avatar">
        <div class="w-10 rounded-full">
            <img
                src={avatarUrl}
                alt="{type} avatar"
            />
        </div>
    </div>
    <div class="chat-header">
        {avatarName}
    </div>
    <div class="chat-bubble {chatBubbleStyle}">
        {message}
    </div>
</div>
