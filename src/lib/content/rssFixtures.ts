import type { SourceRegistryEntry } from './types';

export const SAMPLE_AI_RSS_SOURCE: SourceRegistryEntry = {
  id: 'rss_fixture_ai',
  name: 'SignalDesk Fixture AI Feed',
  url: 'https://example.com/feeds/ai.xml',
  source_type: 'rss',
  language: 'en',
  reliability_tier: 'tier_1',
  category_key: 'ai',
  active: true,
  notes: 'Fixture-only RSS source for normalization and parser tests.',
};

export const SAMPLE_AI_RSS_FEED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>SignalDesk Fixture Feed</title>
    <item>
      <guid>item-001</guid>
      <title>OpenAI expands power agreements for new data centers</title>
      <link>https://example.com/ai/openai-power?utm_source=rss</link>
      <pubDate>Sat, 17 May 2026 00:00:00 GMT</pubDate>
      <description><![CDATA[<p>OpenAI and Microsoft are <strong>securing</strong> additional energy capacity.</p>]]></description>
      <content:encoded><![CDATA[<div><p>OpenAI and Microsoft are securing additional energy capacity.</p></div>]]></content:encoded>
      <author>SignalDesk Test Feed</author>
    </item>
    <item>
      <guid>item-002</guid>
      <title>New AI grid financing vehicles emerge</title>
      <link>https://example.com/ai/grid-financing</link>
      <pubDate>Sat, 17 May 2026 01:00:00 GMT</pubDate>
      <description><![CDATA[<p>Investors are exploring infrastructure-linked financing for AI expansion.</p>]]></description>
      <content:encoded><![CDATA[<div><p>Investors are exploring infrastructure-linked financing for AI expansion.</p></div>]]></content:encoded>
      <author>SignalDesk Test Feed</author>
    </item>
  </channel>
</rss>`;
