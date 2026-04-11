import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'

import { FactCheckRssExtractor } from './FactCheckRssExtractor'

describe('FactCheckRssExtractor', () => {
  it.effect(
    'when fetch is unsuccessful, returns IngestionAttempted event, writes records to archive',
    () =>
      Effect.gen(function* () {
        const rows = yield* FactCheckRssExtractor.extract(
          {
            kind: 'sanitized_record',
            runId: 'run-1',
            version: 1,
            fetchedAt: 0,
            sanitizedAt: 0,
            url: '',
            input: {
              raw: {
                bucket: 'test-bucket',
                object: 'raw.bin',
              },
              record: {
                bucket: 'test-bucket',
                object: 'test-ingestion-record.yml',
              },
            },
            sanitizedRaw: {
              bucket: 'test-bucket',
              object: 'sanitized.bin',
            },
            source: {
              name: 'factcheck.org',
              collection: 'rss',
            },
            content: {
              sha256:
                '88a46ed62d1740a187461f94a3df54e1650afaae2a7fc040fb62eff169415924',
              bytes: 4662,
            },
            http: {
              status: 403,
              contentType: 'text/html; charset=UTF-8',
              headers: {},
            },
            policy: {
              label: 'SAFE_PUBLIC',
              actions: ['DROPPED_HEADERS'],
            },
          },
          Buffer.from(`
            <?xml version="1.0" encoding="UTF-8"?><rss version="2.0"
	xmlns:content="http://purl.org/rss/1.0/modules/content/"
	xmlns:wfw="http://wellformedweb.org/CommentAPI/"
	xmlns:dc="http://purl.org/dc/elements/1.1/"
	xmlns:atom="http://www.w3.org/2005/Atom"
	xmlns:sy="http://purl.org/rss/1.0/modules/syndication/"
	xmlns:slash="http://purl.org/rss/1.0/modules/slash/"
	>

<channel>
	<title>FactCheck.org</title>
	<atom:link href="https://www.factcheck.org/feed/" rel="self" type="application/rss+xml" />
	<link>https://www.factcheck.org/</link>
	<description>A Project of The Annenberg Public Policy Center</description>
	<lastBuildDate>Fri, 10 Apr 2026 00:20:17 +0000</lastBuildDate>
	<language>en-US</language>
	<sy:updatePeriod>
	hourly	</sy:updatePeriod>
	<sy:updateFrequency>
	1	</sy:updateFrequency>
	<generator>https://wordpress.org/?v=6.8.3</generator>
	<item>
		<title>Politicians Say Glyphosate Weedkiller Causes Cancer But Evidence Not Clear-Cut</title>
		<link>https://www.factcheck.org/2026/04/politicians-say-glyphosate-weedkiller-causes-cancer-but-evidence-not-clear-cut/</link>
		
		<dc:creator><![CDATA[Kate Yandell]]></dc:creator>
		<pubDate>Fri, 10 Apr 2026 00:20:15 +0000</pubDate>
				<category><![CDATA[FactCheck Posts]]></category>
		<category><![CDATA[SciCheck]]></category>
		<guid isPermaLink="false">https://www.factcheck.org/?p=281540</guid>

					<description><![CDATA[<p><img width="640" height="273" src="https://cdn.factcheck.org/UploadedFiles/Glyphosate-1-720-x-307.png" class="attachment-medium_large size-medium_large wp-post-image" alt="" style="float:left; margin:0 15px 15px 0;" decoding="async" fetchpriority="high" srcset="https://cdn.factcheck.org/UploadedFiles/Glyphosate-1-720-x-307.png 720w, https://cdn.factcheck.org/UploadedFiles/Glyphosate-1-720-x-307-340x145.png 340w" sizes="(max-width: 640px) 100vw, 640px" />Following an executive order from the Trump administration that promotes production of glyphosate, some Democrats have claimed that the herbicide causes cancer. The science, however, is nuanced. While there is some evidence linking glyphosate to cancers in lab animals or to the blood cancer non-Hodgkin lymphoma in agricultural workers, the findings have been inconsistent.</p>
<p>The post <a href="https://www.factcheck.org/2026/04/politicians-say-glyphosate-weedkiller-causes-cancer-but-evidence-not-clear-cut/">Politicians Say Glyphosate Weedkiller Causes Cancer But Evidence Not Clear-Cut</a> appeared first on <a href="https://www.factcheck.org">FactCheck.org</a>.</p>
]]></description>
										<content:encoded><![CDATA[<img width="640" height="273" src="https://cdn.factcheck.org/UploadedFiles/Glyphosate-1-720-x-307.png" class="attachment-medium_large size-medium_large wp-post-image" alt="" style="float:left; margin:0 15px 15px 0;" decoding="async" srcset="https://cdn.factcheck.org/UploadedFiles/Glyphosate-1-720-x-307.png 720w, https://cdn.factcheck.org/UploadedFiles/Glyphosate-1-720-x-307-340x145.png 340w" sizes="(max-width: 640px) 100vw, 640px" />
<p>Following an executive order from the Trump administration that promotes production of glyphosate, some Democrats have claimed that the herbicide causes cancer. The science, however, is nuanced. While there is some evidence linking glyphosate to cancers in lab animals or to the blood cancer non-Hodgkin lymphoma in agricultural workers, the findings have been inconsistent. </p>


<div class="wp-block-image">
<figure class="alignleft"><img decoding="async" data-pin-description="RFK Jr. Misleads on Autism Prevalence, Causes - FactCheck.org" data-pin-title="The Facts Behind Claims on Autism, Tylenol and Folate - FactCheck.org" src="https://cdn.factcheck.org/UploadedFiles/SciCHECKsquare_4-161x145.png" alt=""/></figure></div>


<p>Regulatory agencies around the world, <a href="https://www.epa.gov/ingredients-used-pesticide-products/glyphosate" target="_blank" rel="noreferrer noopener">including</a> the U.S. Environmental Protection Agency, have <a href="https://www.efsa.europa.eu/en/news/glyphosate-no-critical-areas-concern-data-gaps-identified" target="_blank" rel="noreferrer noopener">concluded</a> <a href="https://www.canada.ca/en/health-canada/services/consumer-product-safety/reports-publications/pesticides-pest-management/fact-sheets-other-resources/request-special-review-glyphosate-herbicides-containing-polyethoxylated-tallowamine/frequently-asked-questions.html" target="_blank" rel="noreferrer noopener">glyphosate</a> is <a href="https://www.apvma.gov.au/resources/frequently-searched-chemicals/glyphosate" target="_blank" rel="noreferrer noopener">unlikely</a> to <a href="https://www.epa.govt.nz/assets/Uploads/Documents/Everyday-Environment/Publications/EPA-glyphosate-review.pdf" target="_blank" rel="noreferrer noopener">pose</a> carcinogenic <a href="https://www.fsc.go.jp/english/evaluationreports/agrichemicalsl_e1.data/kya0100622449b_202.pdf" target="_blank" rel="noreferrer noopener">risks</a>.</p>



<p>In a Feb. 18 <a href="https://www.whitehouse.gov/presidential-actions/2026/02/promoting-the-national-defense-by-ensuring-an-adequate-supply-of-elemental-phosphorus-and-glyphosate-based-herbicides/" target="_blank" rel="noreferrer noopener">executive order</a>, President Donald Trump promoted production of glyphosate-based herbicides — <a href="https://web.archive.org/web/20210418045300/https://www.monsanto.com/app/uploads/2017/06/back_history.pdf" target="_blank" rel="noreferrer noopener">originated</a> in 1974 by Monsanto as the weedkiller Roundup — as necessary for national security. The move was widely <a href="https://www.politico.com/news/2026/02/20/maha-unleashes-on-white-house-after-trump-backs-pesticide-00790187" target="_blank" rel="noreferrer noopener">viewed</a> as counter to the Make America Healthy Again, or MAHA, movement, which generally <a href="https://www.wired.com/story/the-epas-closeness-to-industry-stands-in-the-way-of-it-helping-maha/" target="_blank" rel="noreferrer noopener">opposes</a> pesticides, and prominently glyphosate. Bayer, which <a href="https://www.bayer.com/media/en-us/bayer-closes-monsanto-acquisition/" target="_blank" rel="noreferrer noopener">acquired</a> Monsanto in 2018, is the <a href="https://www.reuters.com/business/healthcare-pharmaceuticals/bayer-glyphosate-shortages-not-expected-outside-us-after-executive-order-2026-02-19/" target="_blank" rel="noreferrer noopener">only company</a> that makes glyphosate in the U.S., although there are also imported generic versions.</p>



<p>Health and Human Services Secretary Robert F. Kennedy Jr., the de facto MAHA leader, has long&nbsp;<a href="https://youtu.be/gGoNyvAvhf0?si=9MriUo87ocm0ZUNv&amp;t=356" target="_blank" rel="noreferrer noopener">said</a>&nbsp;that glyphosate <a href="https://www.youtube.com/watch?si=xcs-x1qoPuN6T4QB&amp;t=1699&amp;v=vm6OspRNnd4&amp;feature=youtu.be" target="_blank" rel="noreferrer noopener">causes</a> cancer, although he <a href="https://www.nytimes.com/2026/02/18/us/politics/trump-boost-weedkiller.html" target="_blank" rel="noreferrer noopener">defended</a> the executive order.</p>



<p>Democrats quickly noted the contradiction — and proceeded to make claims of their own about glyphosate.</p>



<p>“This executive order is a slap in the face to the thousands of Americans who have gotten cancer from glyphosate,” Sen. Cory Booker, a Democrat from New Jersey, said in a Feb. 19&nbsp;<a href="https://www.booker.senate.gov/news/press/booker-condemns-trumps-eo-protecting-toxic-pesticide-manufacturers" target="_blank" rel="noreferrer noopener">statement</a>.&nbsp;</p>



<p>Democratic Sen. Ed&nbsp;Markey of Massachusetts, meanwhile, brought up glyphosate during the Feb. 25&nbsp;<a href="https://www.factcheck.org/2026/03/factchecking-claims-in-casey-means-surgeon-general-confirmation-hearing/">confirmation hearing</a>&nbsp;for the surgeon general nominee, <a href="https://www.youtube.com/live/C4cy3x0cXGg?si=LKfAIh0gPG1C5xVB&amp;t=8714" target="_blank" rel="noreferrer noopener">stating</a> that Trump is “siding with the chemical manufacturing company that is, in fact, causing the cancers.”</p>



<p>Even as he defended Trump’s action, Kennedy has continued to <a href="https://perma.cc/2XWP-7ZFQ" target="_blank" rel="noreferrer noopener">indicate</a> that glyphosate is dangerous. In a Feb. 27 appearance on the &#8220;Joe Rogan Experience,&#8221; for example, he <a href="https://www.youtube.com/watch?si=3rFn4tUpQ5E5yR4X&amp;t=7290&amp;v=wk7DQom821s&amp;feature=youtu.be" target="_blank" rel="noreferrer noopener">mentioned</a> the link to NHL, the blood cancer found in some but not other studies of people who apply glyphosate.</p>



<p>Other Republicans, such as Rep. Nancy Mace of South Carolina, have also responded, although she did not make as strong of a claim about cancer, saying only that glyphosate &#8220;has been linked&#8221; to cancer.</p>



<p>“Glyphosate and other pesticides don’t belong on our food or in our children’s bodies,” she wrote in a March 8 <a href="https://perma.cc/RQ45-Q7T6" target="_blank" rel="noreferrer noopener">post</a> on X. “We are systematically poisoning ourselves.”</p>



<p>There is little to suggest glyphosate causes cancer in the trace amounts present in food.<strong> </strong>Some studies have identified associations between glyphosate exposure and cancer, either in humans who used the herbicide or in animals exposed in the lab. But the findings have been inconsistent, and researchers have come to differing conclusions about the overall evidence.</p>



<p>Results from a large National Institutes of Health&nbsp;<a href="https://pubmed.ncbi.nlm.nih.gov/29136183/">study</a>&nbsp;assessing exposure in&nbsp;<a href="https://aghealth.nih.gov/" target="_blank" rel="noreferrer noopener">agricultural workers</a>, published in 2017, did not find an association between glyphosate and NHL or other cancers. This lack of a concrete connection has led many regulatory agencies to conclude glyphosate is unlikely to cause cancer.</p>



<p>At the same time, a widely cited 2015 <a href="https://www.iarc.who.int/featured-news/media-centre-iarc-news-glyphosate/" target="_blank" rel="noreferrer noopener">report</a> from the World Health Organization’s International Agency for Research on Cancer deemed glyphosate “probably carcinogenic to humans,” based on lab animal data and “limited” real-world evidence linking glyphosate to cancer in humans. </p>



<p>“The overall picture with glyphosate is messy,”&nbsp;<a href="https://profiles.ucr.edu/app/home/profile/eastmond" target="_blank" rel="noreferrer noopener">David Eastmond</a>, a professor emeritus at the University of California, Riverside, who studied genetic toxicology and chemical carcinogenesis, told us. He served on a 2016 committee of the WHO and the Food and Agriculture Organization of the United Nations that&nbsp;<a href="https://apps.who.int/pesticide-residues-jmpr-database/pesticide?name=glyphosate" target="_blank" rel="noreferrer noopener">found</a>&nbsp;human dietary glyphosate exposure was unlikely to cause cancer. “The human studies are messy, the animal studies are messy, the mechanistic studies are messy. And so within that messiness, you try and draw conclusions, and different people interpret that in different ways.”</p>



<p>Below, we will walk through the evidence&nbsp;about glyphosate that&nbsp;regulators and others have&nbsp;assessed, as well as more recent evidence being considered.</p>



<h2 class="wp-block-heading has-text-align-center">Widespread Exposure, But Little Agreement on Risks</h2>



<p>Glyphosate-based herbicides are the most <a href="https://ntp.niehs.nih.gov/research/topics/glyphosate" target="_blank" rel="noreferrer noopener">commonly</a> used weedkillers in the world. As such, wide swaths of people come into at least some contact with them.</p>



<p>Monitoring by the Centers for Disease Control and Prevention has <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC11590049/" target="_blank" rel="noreferrer noopener">found</a> that most people have some detectable glyphosate in their urine, although researchers from the agency have noted that this on its own &#8220;does not mean that glyphosate causes disease or adverse effects.&#8221; Glyphosate <a href="https://www.atsdr.cdc.gov/toxguides/toxguide-214.pdf" target="_blank" rel="noreferrer noopener">does not</a> significantly build up in the body and is rapidly cleared.</p>


<div class="wp-block-image">
<figure class="alignleft size-full"><img decoding="async" width="400" height="267" src="https://cdn.factcheck.org/UploadedFiles/Glyphosate-1-400-x-267.png" alt="" class="wp-image-281775" srcset="https://cdn.factcheck.org/UploadedFiles/Glyphosate-1-400-x-267.png 400w, https://cdn.factcheck.org/UploadedFiles/Glyphosate-1-400-x-267-217x145.png 217w" sizes="(max-width: 400px) 100vw, 400px" /><figcaption class="wp-element-caption">A French farmer sprays the glyphosate-based herbicide Roundup on a corn field. Photo by Jean-Francois Monier/AFP via Getty Images.</figcaption></figure></div>


<p>Agricultural workers are likely to have the <a href="https://pubmed.ncbi.nlm.nih.gov/38636272/" target="_blank" rel="noreferrer noopener">highest exposures</a> to glyphosate. It can also be <a href="https://www.fda.gov/food/pesticides/questions-and-answers-glyphosate" target="_blank" rel="noreferrer noopener">found</a> in trace <a href="https://www.sciencedirect.com/science/article/pii/S0278691521007031?via%3Dihub#sec4" target="_blank" rel="noreferrer noopener">amounts</a> in a variety of foods, particularly grains and legumes. People <a href="https://pubmed.ncbi.nlm.nih.gov/38054699/" target="_blank" rel="noreferrer noopener">living</a> near fields while they are being sprayed have been found to have elevated levels in their urine compared with those living farther away.</p>



<p>In addition to being used on farms, glyphosate-based herbicides were historically sold for residential use, although beginning in 2023 Bayer has&nbsp;<a href="https://perma.cc/SR2U-D5LW" target="_blank" rel="noreferrer noopener">sold</a>&nbsp;new products that include herbicides other than glyphosate, citing the need to “further reduce future litigation risk.&#8221;</p>



<p>Despite such litigation, it&#8217;s unclear what impact exposure to glyphosate-based herbicides — designed to <a href="https://npic.orst.edu/factsheets/archive/glyphotech.html" target="_blank" rel="noreferrer noopener">interfere</a> with a key pathway shared by plants and some microbes but not humans — has on people and at what level.</p>



<p>Glyphosate is not very acutely toxic. Scientists <a href="https://npic.orst.edu/factsheets/archive/glyphotech.html" target="_blank" rel="noreferrer noopener">can test</a> the acute toxicity of a chemical by feeding it to rodents and measuring the dose at which half of the animals have died. It takes more than 4,000 milligrams of glyphosate per kilogram of body weight to kill half of rats; this <a href="https://pubs.acs.org/doi/10.1021/acs.chas.0c00096">means</a> glyphosate is <a href="https://www.pubs.ext.vt.edu/ENTO/ENTO-389/ENTO-389.html" target="_blank" rel="noreferrer noopener">less</a> acutely toxic than table salt. However, for cancer, scientists are interested in long-term effects.</p>



<p>Some researchers say the evidence overall does indicate glyphosate can cause cancer. “Glyphosate and glyphosate-based herbicides (GBHs) harm human health and can cause cancer,” a group of 50 physicians, scientists and others — including the <a href="https://www.latimes.com/science/story/2026-02-03/maha-reshaped-health-policy-now-its-working-on-environmental-rules" target="_blank" rel="noreferrer noopener">MAHA activist</a> Kelly Ryerson — wrote in a <a href="https://deohs.washington.edu/news/sgs" target="_blank" rel="noreferrer noopener">March 27</a> <a href="https://deohs.washington.edu/sgs/statement" target="_blank" rel="noreferrer noopener">statement</a>. “The comprehensive evidence supports this conclusion, with the strongest epidemiological evidence linking exposure to increased risk of non-Hodgkin lymphoma, a cancer of the lymphatic system.” The statement followed a symposium on the health effects of glyphosate held at the University of Washington, which <a href="https://deohs.washington.edu/sites/default/files/2026-03/3.24_SGS%20Public%20Agenda.pdf" target="_blank" rel="noreferrer noopener">brought together</a> academic and government researchers, consultants, lawyers, and representatives from nonprofit organizations.</p>



<p>Others have been less convinced, including, as we have said, regulators in a variety of regions and countries, including <a href="https://www.canada.ca/en/health-canada/services/consumer-product-safety/reports-publications/pesticides-pest-management/fact-sheets-other-resources/request-special-review-glyphosate-herbicides-containing-polyethoxylated-tallowamine/frequently-asked-questions.html" target="_blank" rel="noreferrer noopener">Canada</a>, <a href="https://www.fsc.go.jp/english/evaluationreports/agrichemicalsl_e1.data/kya0100622449b_202.pdf" target="_blank" rel="noreferrer noopener">Japan</a> and the <a href="https://www.efsa.europa.eu/en/news/glyphosate-no-critical-areas-concern-data-gaps-identified" target="_blank" rel="noreferrer noopener">European Union</a>. Some epidemiologists and health communicators have pointed out that any cancer risks in rodents have generally been <a href="https://yourlocalepidemiologist.substack.com/p/glyphosate-a-story-of-science-risk" target="_blank" rel="noreferrer noopener">shown</a> at <a href="https://slate.com/technology/2026/03/roundup-glyphosate-rfk-jr-maha-cancer.html" target="_blank" rel="noreferrer noopener">doses</a> higher than a person typically would be exposed to via their diet, while allowing that there may be concerns for people with more extreme exposures. And as we have said, a large, rigorous epidemiological study in humans did not show an association between glyphosate and cancer.</p>



<p>Adding complexity to this debate, there is a long history of <a href="https://www.cambridge.org/core/journals/european-journal-of-risk-regulation/article/clash-of-scientific-assessors-what-the-conflict-over-glyphosate-carcinogenicity-tells-us-about-the-relationship-between-law-and-science/37ABA26D9D3F68FB5E355AECA7682CFD" target="_blank" rel="noreferrer noopener">concern</a> over the influence Monsanto may have exerted over the scientific literature on its product&#8217;s safety. (Bayer <a href="https://www.bayer.com/media/en-us/bayer-closes-monsanto-acquisition/" target="_blank" rel="noreferrer noopener">acquired</a> Monsanto in 2018.) In December, a journal <a href="https://retractionwatch.com/2025/12/04/glyphosate-safety-article-retracted-elsevier-monsanto-ghostwriting/" target="_blank" rel="noreferrer noopener">retracted</a> a 2000 review paper on glyphosate&#8217;s safety because a Monsanto employee had <a href="https://usrtk.org/wp-content/uploads/2017/03/187series.pdf#page=203" target="_blank" rel="noreferrer noopener">suggested</a> in an internal email that it was ghostwritten.</p>



<p>A Dec. 4 <a href="https://www.bayer.com/en/truth-about-glyphosate" target="_blank" rel="noreferrer noopener">statement</a> from Bayer said that Monsanto&#8217;s role in the 2000 paper &#8220;did not rise to the level of authorship and was appropriately disclosed in the acknowledgments.&#8221; In a statement shared with us via email, a Bayer spokesperson emphasized the safety and extensive testing of the company&#8217;s glyphosate-based products: &#8220;The fact is that no health regulator anywhere in the world has ever found glyphosate to pose a threat to human health.&#8221;</p>



<p>Meanwhile, following the 2015 designation of glyphosate as &#8220;probably carcinogenic&#8221; by the WHO&#8217;s International Agency for Research on Cancer, people with NHL, working with lawyers <a href="https://www.npr.org/2018/08/10/637722786/jury-awards-terminally-ill-man-289-million-in-lawsuit-against-monsanto" target="_blank" rel="noreferrer noopener">including</a> Kennedy, brought <a href="https://cen.acs.org/environment/pesticides/bayer-roundup-glyphosate-cancer-class-action-lawsuit-settlement/104/web/2026/03" target="_blank" rel="noreferrer noopener">thousands</a> of lawsuits against Bayer alleging harm from Roundup. (An aide for Booker, the senator from New Jersey, told us via email that the &#8220;estimate that thousands of Americans have gotten cancer from glyphosate is supported by the <a href="https://cdn.ca9.uscourts.gov/datastore/opinions/2021/05/14/19-16636.pdf">lawsuits</a> brought by thousands of people in the United States who developed cancer after using&nbsp;glyphosate-based herbicides.&#8221;)</p>



<p>Bayer on Feb. 17&nbsp;<a href="https://www.bayer.com/media/en-us/monsanto-announces-roundup-class-settlement-agreement-to-resolve-current-and-future-claims/" target="_blank" rel="noreferrer noopener">proposed</a>&nbsp;a $7.25 billion settlement of current and future cases. Meanwhile, the Supreme Court will hear arguments this month over whether people can bring cases against Bayer under state law alleging failure to warn about harms on the labels for glyphosate-containing products. (The Trump administration&nbsp;<a href="https://www.reuters.com/sustainability/boards-policy-regulation/trump-administration-backs-bayers-bid-curb-roundup-lawsuits-2025-12-02/" target="_blank" rel="noreferrer noopener">filed</a>&nbsp;a Dec. 1 amicus brief supporting Bayer&#8217;s position.) Advocacy groups have also <a href="https://perma.cc/4WWA-85DC" target="_blank" rel="noreferrer noopener">challenged</a> the EPA&#8217;s conclusions. The EPA is <a href="https://www.nytimes.com/2026/01/16/climate/supreme-court-roundup-pesticide.html" target="_blank" rel="noreferrer noopener">supposed</a> to issue a revised decision by October.</p>



<p>&#8220;This year, EPA will undertake a comprehensive, transparent, and rigorous scientific review of glyphosate to evaluate its use and ensure decisions are fully aligned with the best available science as well as human health and environmental protections,” an EPA spokesperson told us via email.</p>



<p>The glyphosate litigation has brought in scientists to serve as <a href="https://www.science.org/content/article/tough-experience-why-would-scientist-serve-expert-witness" target="_blank" rel="noreferrer noopener">expert witnesses</a> for both sides.</p>



<p>&#8220;We all have biases to some degree, but some are influenced by external factors,&#8221; Eastmond said. He brought up stories about Monsanto&#8217;s ghostwriting, as well as the conflicts that can come from testifying as an expert witness. &#8220;If you’re working on one side or the other, you tend to study and focus research to support that point of view,&#8221; he said. He added that he is not aware of conflicts of interest on his part.</p>



<p>Another possible explanation for varying conclusions between IARC and pesticide regulators is that the groups had different procedures and were assessing different questions. IARC was assessing whether glyphosate is a <a href="https://www.efsa.europa.eu/en/discover/infographics/hazard-vs-risk" target="_blank" rel="noreferrer noopener">hazard</a> — i.e., whether it has the theoretical ability to cause harm. Some other groups were assessing glyphosate&#8217;s risk, or how likely glyphosate is to be causing harm under certain circumstances, such as under typical exposures.</p>



<p>For example, the 2016 committee from the WHO and U.N. Food and Agriculture Organization that assessed glyphosate was tasked with determining whether dietary exposures from very low levels of pesticide residues came with cancer risk, which is different from the question of whether some very high level of exposure could cancer. Regulators also tend to assess risk under realistic levels of exposure.</p>



<p>However, a look at different groups&#8217; and scientists&#8217; arguments also reveals more fundamental disagreements on how to interpret the science, and multiple situations where evaluating carcinogenicity is not cut-and-dried.</p>



<h2 class="wp-block-heading has-text-align-center">Inconsistent Evidence in Humans</h2>



<p>The available studies in humans come to differing conclusions about whether glyphosate is associated with cancer in people who apply the herbicide. Meanwhile, there isn&#8217;t evidence in humans that low-level exposures in food are associated with cancer. It is challenging to study whether glyphosate causes cancer in humans both because cancer takes many years to develop and because it is tricky to assess how much of the herbicide people have been exposed to over a stretch of time.</p>



<p>At the time that IARC assessed the human evidence of glyphosate&#8217;s carcinogenicity as &#8220;limited,&#8221; <a href="https://pubmed.ncbi.nlm.nih.gov/12937207/" target="_blank" rel="noreferrer noopener">there</a> <a href="https://pubmed.ncbi.nlm.nih.gov/12148884/" target="_blank" rel="noreferrer noopener">were</a> <a href="https://pubmed.ncbi.nlm.nih.gov/18623080/" target="_blank" rel="noreferrer noopener">half</a> a <a href="https://pubmed.ncbi.nlm.nih.gov/11700263/" target="_blank" rel="noreferrer noopener">dozen</a> <a href="https://pubmed.ncbi.nlm.nih.gov/19017688/" target="_blank" rel="noreferrer noopener">studies</a> <a href="https://pubmed.ncbi.nlm.nih.gov/15626647/" target="_blank" rel="noreferrer noopener">assessing</a> glyphosate and NHL in humans,&nbsp;<a href="https://dceg.cancer.gov/about/staff-directory/beane-freeman-laura" target="_blank" rel="noreferrer noopener">Laura Beane Freeman</a>, an epidemiologist at the National Cancer Institute, explained during a March 25 presentation at the Seattle Glyphosate Symposium. “Most, but not all, of the studies had some evidence of an association with non-Hodgkin lymphoma overall,” she said. “And I&#8217;m using that term loosely. It doesn&#8217;t necessarily mean statistical significance, it just means some evidence of a positive association.”</p>



<p>The studies that initially raised concerns were case-control studies. This type of study identifies people who developed a type of cancer in a population, as well as controls from the same population who did not have cancer, and then assesses their exposure in retrospect. The studies relied on asking participants or their family members about past glyphosate exposure. </p>



<p>In a&nbsp;<a href="https://www.regulations.gov/document/EPA-HQ-OPP-2009-0361-0073" target="_blank" rel="noreferrer noopener">review</a> of the evidence published in 2017, the EPA pointed out that not all of the studies took into account whether people were exposed to other pesticides, which could have had their own health effects, and that many studies had small sample sizes. “In epidemiological studies, there was no evidence of an association between glyphosate exposure and numerous cancer outcomes; however, due to conflicting results and various limitations identified in studies investigating NHL, a conclusion regarding the association between glyphosate exposure and risk of NHL cannot be determined based on the available data,” the agency review concluded.</p>



<p>The Agricultural Health Study is a prospective cohort study that enrolled licensed pesticide applicators and has followed them for many years. An advantage of this sort of forward-looking study is that people’s estimates of how much pesticide they used cannot be biased by knowing whether they later went on to develop cancer, unlike in studies that ask people with cancer to look back at their past exposures. In addition, it is easier for this sort of study to look at a greater variety of cancer types.</p>



<p>A 2005&nbsp;<a href="https://pubmed.ncbi.nlm.nih.gov/15626647/" target="_blank" rel="noreferrer noopener">analysis</a>&nbsp;of the study did not find an association between glyphosate and cancer. A 2018 updated&nbsp;<a href="https://pubmed.ncbi.nlm.nih.gov/29136183/" target="_blank" rel="noreferrer noopener">analysis</a>&nbsp;of the more than 54,000 participants also found no association between glyphosate use and any cancer type. (For acute myeloid leukemia, there was a numerically higher number of cases in farmers with the highest exposures, but the result was not statistically significant.)</p>



<p>For some, the negative results in the AHS are convincing, particularly given the fact that glyphosate use has increased since it came to market in the 1970s but NHL has slightly <a href="https://seer.cancer.gov/statistics-network/explorer/application.html?site=86&amp;data_type=1&amp;graph_type=1&amp;compareBy=sex&amp;chk_sex_1=1&amp;chk_sex_3=3&amp;chk_sex_2=2&amp;rate_type=2&amp;race=1&amp;age_range=1&amp;advopt_precision=1&amp;advopt_show_ci=on#resultsRegion0" target="_blank" rel="noreferrer noopener">fallen</a> overall since its peak in 2007. “The strongest study to date in my understanding is the Agricultural Health Study,” Eastmond said. “They just didn&#8217;t see any evidence” for cancer, with the exception of the possible increase in AML.</p>



<p>&#8220;That long-term study of agricultural workers, with a relatively well-defined exposure, over now approaching 20 years, shows no evidence of a risk of cancer,”&nbsp;<a href="https://profiles.imperial.ac.uk/a.boobis" target="_blank" rel="noreferrer noopener">Alan Boobis</a>, an emeritus professor of toxicology at Imperial College London, told us. Boobis led the FAO/WHO committee that evaluated glyphosate in 2016.</p>



<p>Other researchers have been reluctant to interpret the AHS as vindicating glyphosate. &#8220;Even though the Agricultural Health Study was largely negative, there are other studies that were strongly positive,” Dr.&nbsp;<a href="https://www.bc.edu/bc-web/schools/morrissey/departments/biology/people/faculty-directory/Phil-Landrigan.html" target="_blank" rel="noreferrer noopener">Philip Landrigan</a>, a pediatrician and public health physician at Boston College who signed the Seattle Glyphosate Symposium statement, told us.</p>



<p>At the symposium, he called a 2019 <a href="https://pubmed.ncbi.nlm.nih.gov/31342895/" target="_blank" rel="noreferrer noopener">meta-analysis</a> the “most noteworthy” of the newer studies in humans. (Meta-analyses also attempt to make sense of the data overall by combining results from multiple studies.) A spokesperson for Mace, the representative from South Carolina, had highlighted this study when asked about the data behind her concerns about glyphosate.</p>



<p>The&nbsp;<a href="https://pubmed.ncbi.nlm.nih.gov/31342895/" target="_blank" rel="noreferrer noopener">study</a> found that groups reporting the highest level of glyphosate-based herbicide exposure had a 41% higher rate of NHL than those who did not report use.</p>



<p>“I actually do think the scientific evidence is really strong” implicating glyphosate and glyphosate-based herbicides as carcinogens, <a href="https://publichealth.berkeley.edu/people/luoping-zhang" target="_blank" rel="noreferrer noopener">Luoping Zhang</a>, the first author of the study and an adjunct professor emerita of toxicology at the University of California, Berkeley, told us. Zhang was on a 2016 EPA panel that reviewed glyphosate and was one of the signers of the Seattle Glyphosate Symposium statement. She has been an expert witness for plaintiffs in glyphosate lawsuits.</p>



<p>However, a 2020 EPA <a href="https://www.epa.gov/sites/default/files/2020-01/documents/glyphosate-epidemiological-review-zhang-leon-proposed-interim-decision.pdf" target="_blank" rel="noreferrer noopener">review</a> of Zhang&#8217;s meta-analysis questioned whether the researchers had a good rationale for zeroing in on the highest-exposure groups. The review emphasized that the updated AHS study — which it called “the largest study and of the highest quality” — found no sign of an increasing risk of NHL in people exposed to higher levels of glyphosate.</p>



<p>Zhang defended her team’s choice to look at high-exposure groups as common sense. “If you are thinking exposure to chemical A can cause cancer, everybody would believe the more you expose, the higher level you expose,&#8221; the higher the chance of cancer, she told us.</p>



<h2 class="wp-block-heading has-text-align-center"><strong>Divergent Readings of Rodent Studies</strong></h2>



<p>Scientists often look at data in rodents to better understand whether a chemical is likely to be harmful to humans, as it is possible to expose the mice and rats to precise quantities of the substance and assess its effects over a relatively short period of time. Again, groups diverged in their evaluation of the data on glyphosate, with IARC <a href="https://www.thelancet.com/journals/lanonc/article/PIIS1470-2045(15)70134-8/fulltext" target="_blank" rel="noreferrer noopener">finding</a> “sufficient” evidence in animals that it could cause cancer and regulators viewing the rodent cancer data more skeptically.</p>



<p>An important factor is that different groups reviewing glyphosate did not rely on exactly the same data, Eastmond said. IARC only considers data that the public has access to. Regulatory agencies consider proprietary data submitted from companies, and the FAO/WHO group also gained access to this data.&nbsp;</p>



<p>Some scientists have&nbsp;<a href="https://academic.oup.com/toxsci/article/175/2/156/5810105?login=true" target="_blank" rel="noreferrer noopener">contended</a> that IARC did not properly account for the many statistical comparisons in the rodent data. With more comparisons, it becomes more likely that there will be statistically significant results by chance alone. “That&#8217;s part of the reason people can interpret things quite differently,” Eastmond said.</p>



<p>In coming to its conclusion on glyphosate&#8217;s carcinogenicity, IARC cited an increased rate of a rare form of kidney cancer in a type of male lab mouse exposed to glyphosate and increased cancer of the blood vessels in exposed male mice, as well as increases in some benign kidney tumors.</p>



<p>Other groups interpreted the rodent data differently. “Based on the weight-of-evidence evaluations, the agency has concluded that none of the tumors evaluated in individual rat and mouse carcinogenicity studies are treatment-related,” for various reasons, the EPA concluded in its&nbsp;<a href="https://www.regulations.gov/document/EPA-HQ-OPP-2009-0361-0073" target="_blank" rel="noreferrer noopener">review</a>. The agency did not find a significant increase in kidney tumors in mice, after a reanalysis found an additional tumor in the control mice that previously had not been seen. The EPA’s review also noted that some mice in the study received atypically high doses of glyphosate.</p>



<p>The European Chemicals Agency, or ECHA, similarly concluded in 2022 <a href="https://echa.europa.eu/documents/10162/5702e99d-d503-f154-226f-d8ab070ac47a#page=75" target="_blank" rel="noreferrer noopener">that</a> the mouse data “did not demonstrate convincing evidence of glyphosate induced” tumors. The group <a href="https://echa.europa.eu/documents/10162/5702e99d-d503-f154-226f-d8ab070ac47a#page=69" target="_blank" rel="noreferrer noopener">did find</a> some increased rare kidney tumors in male mice exposed to very high levels of glyphosate but called the relevance to humans “low” due to the high dose.</p>



<p>The FAO/WHO group that Eastmond and Boobis were a part of, meanwhile, “concluded that glyphosate is not carcinogenic in rats but could not exclude the possibility that it is carcinogenic in mice at very high doses,” according to the 2016&nbsp;<a href="https://apps.who.int/pesticide-residues-jmpr-database/pesticide?name=glyphosate" target="_blank" rel="noreferrer noopener">report</a>&nbsp;released on its conclusions. However, the group — which was only tasked with assessing the effects of pesticides in food — concluded that &#8220;those effects were seen at such high doses that we did not think it was relevant for the decisions we were making about pesticide residues in the diet,” Eastmond said.</p>



<p>Some people with concerns about glyphosate cite a June 2025 <a href="https://pubmed.ncbi.nlm.nih.gov/40490737/" target="_blank" rel="noreferrer noopener">study</a> in rats as evidence that the herbicide can be carcinogenic at lower doses. (The aide for Booker, the senator from New Jersey, cited this study, among other <a href="https://www.iarc.who.int/featured-news/media-centre-iarc-news-glyphosate/" target="_blank" rel="noreferrer noopener">sources</a> <a href="https://oehha.ca.gov/proposition-65/crnr/glyphosate-listed-effective-july-7-2017-known-state-california-cause-cancer" target="_blank" rel="noreferrer noopener">suggesting</a> glyphosate is carcinogenic.) The study found elevated rates of various cancers in rats exposed to glyphosate or glyphosate-based herbicides beginning in utero and through their lives. This included an increase in early-life leukemia, which is rare in the type of rats studied. The researchers used doses of glyphosate pegged to European regulatory limits for daily exposure.</p>



<p>“What that says to me is that the levels that people are being exposed to today in food &#8230; those levels have risk,” Landrigan said, adding that the study establishes that glyphosate causes cancer. “The risk to any one person may be relatively low, but when millions of people are exposed &#8230; there are always going to be some people who eat more contaminated food than others, and there are always going to be some people in the population who are biologically more sensitive than others &#8230; so across a population if you expose a whole population to a chemical that has the power to cause cancer, then you&#8217;re going to push up the risk across the population.”</p>



<p>However, some scientists have&nbsp;<a rel="noreferrer noopener" target="_blank" href="https://geneticliteracyproject.org/2025/08/18/viewpoint-travesty-of-science-latest-global-glyphosate-study-is-a-scientific-mess-issued-by-the-ethically-compromised-ramazzini-institute/">criticized</a>&nbsp;the study as using unusual statistical and other methods, while noting that its conclusions contrast with those of other rat studies.</p>



<p>In a July 2025&nbsp;<a href="https://www.bfr.bund.de/en/notification/animal-study-on-glyphosate-and-cancer-detailed-analysis-required/" target="_blank" rel="noreferrer noopener">review</a>, for example, scientists from the German Federal Institute for Risk Assessment — the group that led the most recent European Union safety review of glyphosate – wrote that “due to its design, the study is only very limited in its comparability with the many long-term studies on glyphosate that are already available” and “does not refute their findings.” The German review said that prior studies using far higher exposures had not gotten similar results.</p>



<p>The “unusual” study design of the new rat study “doesn&#8217;t in itself invalidate the study, but it means that it needs to be open to scrutiny,” Boobis said. “They have been very reluctant to let outsiders access to the raw data, the pathology slides, etc., to do independent evaluation.” He also called the way the study counted the tumors and compared the groups of rats “extremely unconventional.”</p>



<h2 class="wp-block-heading has-text-align-center"><strong>Sifting Through the Mechanistic Data</strong></h2>



<p>The third line of evidence scientists use to evaluate whether a chemical is carcinogenic is whether there is a mechanistic explanation for how it causes cancer. Again, groups have come to divergent conclusions about whether glyphosate leads to cancer-related changes.</p>



<p>IARC found “strong” mechanistic evidence that glyphosate causes cancer, citing evidence that it damages DNA, called genotoxicity. The group also found evidence of&nbsp;<a href="https://www.cancer.gov/publications/dictionaries/cancer-terms/def/oxidative-stress" target="_blank" rel="noreferrer noopener">oxidative stress</a>, a more indirect measure of possible carcinogenicity. Cells are considered to be under oxidative stress when they fall behind on dealing with reactive oxygen-containing molecules. In the long-term, this can lead to cancer.</p>



<p>In contrast, the EPA <a href="https://www.regulations.gov/document/EPA-HQ-OPP-2009-0361-0073" target="_blank" rel="noreferrer noopener">review</a> concluded that the available data showed that glyphosate does not cause DNA mutations when consumed by mouth. The FAO/WHO group also did not <a href="https://apps.who.int/pesticide-residues-jmpr-database/pesticide?name=glyphosate" target="_blank" rel="noreferrer noopener">find</a> genotoxic effects from glyphosate in mammals exposed orally, and the European ECHA evaluation also <a href="https://echa.europa.eu/documents/10162/5702e99d-d503-f154-226f-d8ab070ac47a#page=40" target="_blank" rel="noreferrer noopener">concluded</a> glyphosate did not cause mutations.</p>



<p>Eastmond, who helped lead the FAO/WHO group&#8217;s efforts to weigh the mechanistic evidence, said that people may come to different conclusions about genotoxicity in part because there are so many studies on the topic, with widely varying quality, and because IARC only considered published studies while others had data from the manufacturer. “We focused on what we thought were the most relevant for human risk by the oral route of exposure,” he said. “When we did that, we thought the evidence was clearly pretty overwhelmingly negative for genotoxicity.”&nbsp;</p>



<p>More recently, National Cancer Institute researchers have also taken urine samples from agricultural workers in the AHS and&nbsp;<a href="https://pubmed.ncbi.nlm.nih.gov/36629488/" target="_blank" rel="noreferrer noopener">found</a>&nbsp;some signs of increased oxidative stress in urine that had more glyphosate in it.</p>



<p>However, Boobis and Eastmond noted that many substances cause oxidative stress, and that this does not always lead to cancer.</p>



<p>A different recent NCI study&nbsp;<a href="https://pubmed.ncbi.nlm.nih.gov/38055050/" target="_blank" rel="noreferrer noopener">found</a>&nbsp;that among agricultural workers in the AHS study, higher self-reported exposure to glyphosate over time was associated with certain chromosomal changes, although the authors said their results would need to be replicated.</p>



<p>Another question is whether there is a difference between exposure to glyphosate on its own versus glyphosate-based herbicides, which contain other ingredients which are in some cases proprietary. Some recent&nbsp;<a href="https://academic.oup.com/toxsci/advance-article/doi/10.1093/toxsci/kfag029/8520920" target="_blank" rel="noreferrer noopener">mechanistic</a>&nbsp;<a href="https://onlinelibrary.wiley.com/doi/10.1002/em.22534" target="_blank" rel="noreferrer noopener">studies</a>&nbsp;have suggested that glyphosate is unlikely to cause cancer-related changes in cells but raise the possibility that glyphosate-based herbicides, which also include other ingredients, may lead to these changes.</p>



<p>Eastmond acknowledged that despite the large amount of data on glyphosate, there are still potential gaps. He noted that the original court case was brought by a person who was exposed “extensively&#8221; via the skin, where most studies are of oral exposure. “You could argue maybe there&#8217;s a difference,” he said. He added that he tells people to take precautions while applying pesticides but doesn’t in most cases &#8220;worry too much about everything I eat and drink.”</p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<p><em>Editor’s note: FactCheck.org does not accept advertising. We rely on grants and individual donations from people like you. Please consider a donation. Credit card donations may be made through <a href="https://giving.aws.cloud.upenn.edu/?fastStart=simpleForm&amp;program=ANS&amp;fund=602014" target="_blank" rel="noreferrer noopener">our “Donate” page</a>. If you prefer to give by check, send to: FactCheck.org, Annenberg Public Policy Center, P.O. Box 58100, Philadelphia, PA 19102. </em></p>
<p>The post <a href="https://www.factcheck.org/2026/04/politicians-say-glyphosate-weedkiller-causes-cancer-but-evidence-not-clear-cut/">Politicians Say Glyphosate Weedkiller Causes Cancer But Evidence Not Clear-Cut</a> appeared first on <a href="https://www.factcheck.org">FactCheck.org</a>.</p>
]]></content:encoded>
					
		
		
			</item>
		<item>
		<title>The U.S. Treasury Didn&#8217;t Declare the Country &#8216;Insolvent&#8217;</title>
		<link>https://www.factcheck.org/2026/04/the-u-s-treasury-didnt-declare-the-country-insolvent/</link>
		
		<dc:creator><![CDATA[Saranac Hale Spencer]]></dc:creator>
		<pubDate>Tue, 07 Apr 2026 13:38:43 +0000</pubDate>
				<category><![CDATA[Ask FactCheck]]></category>
		<category><![CDATA[Debunking Viral Claims]]></category>
		<guid isPermaLink="false">https://www.factcheck.org/?p=281523</guid>

					<description><![CDATA[<p><img width="640" height="273" src="https://cdn.factcheck.org/UploadedFiles/Money-Capitol-720-x-307.png" class="attachment-medium_large size-medium_large wp-post-image" alt="" style="float:left; margin:0 15px 15px 0;" decoding="async" loading="lazy" srcset="https://cdn.factcheck.org/UploadedFiles/Money-Capitol-720-x-307.png 720w, https://cdn.factcheck.org/UploadedFiles/Money-Capitol-720-x-307-340x145.png 340w" sizes="auto, (max-width: 640px) 100vw, 640px" />Q:&#160;I read this on FB. Is it true? The U.S. Treasury just declared the U.S government is&#160;insolvent.</p>
<p>A:&#160;No. That’s the conclusion of an opinion piece that cited a Treasury report showing the government’s liabilities outweigh its assets. But that’s been the case for decades, and unlike an insolvent business, the government can levy taxes.</p>
<p><span id="more-281523"></span></p>
<p>FULL ANSWER</p>
<p>Two economists &#8212; Steve Hanke at Johns Hopkins University and David Walker, a former comptroller general of the U.S.</p>
<p>The post <a href="https://www.factcheck.org/2026/04/the-u-s-treasury-didnt-declare-the-country-insolvent/">The U.S. Treasury Didn&#8217;t Declare the Country &#8216;Insolvent&#8217;</a> appeared first on <a href="https://www.factcheck.org">FactCheck.org</a>.</p>
]]></description>
										<content:encoded><![CDATA[<img width="640" height="273" src="https://cdn.factcheck.org/UploadedFiles/Money-Capitol-720-x-307.png" class="attachment-medium_large size-medium_large wp-post-image" alt="" style="float:left; margin:0 15px 15px 0;" decoding="async" loading="lazy" srcset="https://cdn.factcheck.org/UploadedFiles/Money-Capitol-720-x-307.png 720w, https://cdn.factcheck.org/UploadedFiles/Money-Capitol-720-x-307-340x145.png 340w" sizes="auto, (max-width: 640px) 100vw, 640px" />
<p><strong>Q:&nbsp;I read this on FB. Is it true? The U.S. Treasury just declared the U.S government is&nbsp;insolvent.</strong></p>



<p><strong>A:</strong>&nbsp;<strong>No. That’s the conclusion of an opinion piece that cited a Treasury report showing the government’s liabilities outweigh its assets. But that’s been the case for decades, and unlike an insolvent business, the government can levy taxes.</strong></p>



<span id="more-281523"></span>



<h2 class="wp-block-heading"><strong>FULL ANSWER</strong></h2>



<p>Two economists &#8212; Steve Hanke at Johns Hopkins University and David Walker, a former comptroller general of the U.S. &#8212; published an opinion <a href="https://fortune.com/2026/03/23/us-government-insolvent-fiscal-crisis-fix/" target="_blank" rel="noreferrer noopener">piece</a> in Fortune last month advocating <a href="https://www.congress.gov/bill/119th-congress/house-bill/3289" target="_blank" rel="noreferrer noopener">bills</a> <a href="https://www.congress.gov/bill/119th-congress/house-concurrent-resolution/15" target="_blank" rel="noreferrer noopener">aimed</a> at reining in the national debt. In support of this, they pointed to the U.S. Treasury&#8217;s financial <a href="https://fiscal.treasury.gov/system/files/2026-03/FY-2025-Financial-Report-3-19-2025%28Final%29.pdf" target="_blank" rel="noreferrer noopener">report</a> on fiscal year 2025, noting that the liabilities for the U.S. government far outweighed the assets and characterizing the government as &#8220;insolvent.&#8221;</p>


<div class="wp-block-image">
<figure class="alignleft size-full"><img loading="lazy" decoding="async" width="400" height="267" src="https://cdn.factcheck.org/UploadedFiles/Money-Capitol-400-x-267.png" alt="" class="wp-image-281726" srcset="https://cdn.factcheck.org/UploadedFiles/Money-Capitol-400-x-267.png 400w, https://cdn.factcheck.org/UploadedFiles/Money-Capitol-400-x-267-217x145.png 217w" sizes="auto, (max-width: 400px) 100vw, 400px" /><figcaption class="wp-element-caption">Image by W.Scott McGill / stock.adobe.com</figcaption></figure></div>


<p>The headline on the March 23 piece &#8212; &#8220;The Treasury just declared the U.S. insolvent. The media missed it&#8221; &#8212; <a href="https://www.facebook.com/TheLeftDotOrg/posts/pfbid02RqEe8tQbEkFfg3nBqUxDQn9DVcZnUEGzZHhp89gqfFYFKXL7TgAeWd6DWg5MxKRRl" target="_blank" rel="noreferrer noopener">became a viral claim</a> on social media, suggesting that there&#8217;s been a major new development in the government&#8217;s financial position.<br><br>But there hasn’t been. One reader asked us about a post that suggested President Donald Trump was to blame.</p>



<p>&#8220;The U.S. Treasury did not declare the U.S. government insolvent,&#8221; said <a href="https://budgetmodel.wharton.upenn.edu/a/kent-smetters.md/" target="_blank" rel="noreferrer noopener">Kent Smetters</a>, faculty director of the Penn Wharton Budget Model, who told us that he agreed with the larger point of the opinion piece &#8212; that the government&#8217;s fiscal policy is imbalanced and in need of change.</p>



<p>The writers cited the most recent annual <a href="https://fiscal.treasury.gov/system/files/2026-03/FY-2025-Financial-Report-3-19-2025%28Final%29.pdf" target="_blank" rel="noreferrer noopener">report</a> from the Treasury, released in March, that listed the government&#8217;s total assets for fiscal year 2025 &#8212; including cash on hand, federal land and loans owed &#8212; as just over $6 trillion. It listed the total liabilities as almost $48 trillion.</p>



<p>From that, they concluded, &#8220;The U.S. government is insolvent. That’s not hyperbole — it’s the conclusion drawn directly from the Treasury Department’s own consolidated financial statements for fiscal year 2025, released last week to near-total media silence.&#8221;</p>



<p>The economists likened the federal government to a household with liabilities totaling much more than its assets could cover. &#8220;Uncle Sam, by any accounting standard, is insolvent,&#8221; they wrote.</p>



<p>But <a href="https://www.brookings.edu/people/jessica-riedl/" target="_blank" rel="noreferrer noopener">Jessica Riedl</a>, a budget and tax fellow at the Brookings Institution, told us that the economists are using the methodology of a business, rather than a government &#8212; which, importantly, has the authority to levy taxes. The Treasury report does, indeed, confirm that the government could not pay off the federal debt and cover its commitments by selling its assets. &#8220;If they didn&#8217;t have the power to tax, that would be a problem,&#8221; Riedl said.</p>



<p>The Treasury <a href="https://fiscal.treasury.gov/system/files/2026-03/FY-2025-Financial-Report-3-19-2025%28Final%29.pdf" target="_blank" rel="noreferrer noopener">report</a>, itself, makes this point, too. &#8220;Due to its sovereign power to tax and borrow, and the country’s wide economic base, the government has unique access to financial resources through generating tax revenues and issuing federal debt securities,&#8221; it said. &#8220;This provides the government with the ability to meet present obligations and those that are anticipated from future operations and are not reflected in net position.&#8221;</p>



<p>Smetters said something similar. &#8220;The government&#8217;s assets are beyond just its holdings of property and buildings and things like that. It&#8217;s really the fact that it has access to a tax base that&#8217;s still pretty large in present value.&#8221;</p>



<p><a href="https://www.taxpayer.net/steve-ellis/" target="_blank" rel="noreferrer noopener">Steve Ellis</a>, president of the nonpartisan budget watchdog Taxpayers for Common Sense, told us in an email, &#8220;I don’t think insolvency is the right term for the federal government. Except for a short time in Andrew Jackson&#8217;s presidency the country has always been in debt. Even when there was brief surplus in late 90s, early aughts, there was still debt.&#8221;</p>



<p>All three of the experts we spoke to, though, agreed with the larger premise of the opinion piece, which is that the federal budget is unsustainably imbalanced.</p>



<p>The <a href="https://treasurydirect.gov/help-center/public-debt-faqs/" target="_blank" rel="noreferrer noopener">debt held by the public</a>, which excludes money the federal government owes to itself, was <a href="https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/debt-to-the-penny" target="_blank" rel="noreferrer noopener">$31.4 trillion</a>&nbsp;as of April 3. The nonpartisan Congressional Budget Office <a href="https://www.cbo.gov/publication/62105" target="_blank" rel="noreferrer noopener">estimates</a>&nbsp;that the fiscal year 2026 deficit will be $1.9 trillion, and in 2036, the annual deficit will be $3.1 trillion.&nbsp;</p>



<p>&#8220;The real problem facing the government,&#8221; Smetters said, &#8220;is that we currently have a fiscal policy path that is itself imbalanced. Specifically, the present value of future spending far exceeds the present value of future tax revenue. To create balance, we would either need to raise all federal income taxes, including payroll taxes, immediately and forever by 30%, or cut all federal spending, including entitlement programs, immediately and forever by 25%, or some combination.&#8221;</p>



<p>But the Treasury has not revealed any new insolvency. The government&#8217;s liabilities have been larger than its assets in the Treasury&#8217;s <a href="https://fiscal.treasury.gov/accounting/us-financial-report/previous-reports" target="_blank" rel="noreferrer noopener">annual reports</a> going back decades.</p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<p><em>Editor’s note: FactCheck.org does not accept advertising. We rely on grants and individual donations from people like you. Please consider a donation. Credit card donations may be made through <a href="https://giving.aws.cloud.upenn.edu/?fastStart=simpleForm&amp;program=ANS&amp;fund=602014" target="_blank" rel="noreferrer noopener">our “Donate” page</a>. If you prefer to give by check, send to: FactCheck.org, Annenberg Public Policy Center, P.O. Box 58100, Philadelphia, PA 19102. </em></p>
<p>The post <a href="https://www.factcheck.org/2026/04/the-u-s-treasury-didnt-declare-the-country-insolvent/">The U.S. Treasury Didn&#8217;t Declare the Country &#8216;Insolvent&#8217;</a> appeared first on <a href="https://www.factcheck.org">FactCheck.org</a>.</p>
]]></content:encoded>
					
		
		
			</item>
		<item>
		<title>Trump Fumbles the Facts with Farmers</title>
		<link>https://www.factcheck.org/2026/04/trump-fumbles-the-facts-with-farmers/</link>
		
		<dc:creator><![CDATA[Robert Farley]]></dc:creator>
		<pubDate>Fri, 03 Apr 2026 21:09:41 +0000</pubDate>
				<category><![CDATA[FactCheck Posts]]></category>
		<guid isPermaLink="false">https://www.factcheck.org/?p=281532</guid>

					<description><![CDATA[<p><img width="640" height="273" src="https://cdn.factcheck.org/UploadedFiles/WH-Tractor-720-x-307.png" class="attachment-medium_large size-medium_large wp-post-image" alt="" style="float:left; margin:0 15px 15px 0;" decoding="async" loading="lazy" srcset="https://cdn.factcheck.org/UploadedFiles/WH-Tractor-720-x-307.png 720w, https://cdn.factcheck.org/UploadedFiles/WH-Tractor-720-x-307-340x145.png 340w" sizes="auto, (max-width: 640px) 100vw, 640px" />In a speech to what he called "the single largest gathering of American farmers that the White House has ... ever had," President Donald Trump distorted the facts on the estate tax, soybean exports and more.</p>
<p>The post <a href="https://www.factcheck.org/2026/04/trump-fumbles-the-facts-with-farmers/">Trump Fumbles the Facts with Farmers</a> appeared first on <a href="https://www.factcheck.org">FactCheck.org</a>.</p>
]]></description>
										<content:encoded><![CDATA[<img width="640" height="273" src="https://cdn.factcheck.org/UploadedFiles/WH-Tractor-720-x-307.png" class="attachment-medium_large size-medium_large wp-post-image" alt="" style="float:left; margin:0 15px 15px 0;" decoding="async" loading="lazy" srcset="https://cdn.factcheck.org/UploadedFiles/WH-Tractor-720-x-307.png 720w, https://cdn.factcheck.org/UploadedFiles/WH-Tractor-720-x-307-340x145.png 340w" sizes="auto, (max-width: 640px) 100vw, 640px" />
<p>In a speech to what he called &#8220;the single largest gathering of American farmers that the White House has &#8230; ever had,&#8221; President Donald Trump distorted the facts on the estate tax, soybean exports and more.</p>



<ul class="wp-block-list">
<li>Trump falsely claimed that “we saved 2 million American farms from extinction by virtually ending the unfair estate tax.” That’s roughly the total number of farms in the country. The U.S. Department of Agriculture said only about 1% of farms would have paid any estate tax even if Congress had not permanently extended provisions that were set to expire. Experts say few, if any, farms were saved from extinction.</li>
</ul>



<ul class="wp-block-list">
<li>He wrongly claimed that &#8220;American soybeans are now being shipped to China in record amounts.&#8221; U.S. exports aren&#8217;t on track for a record this year, and a trade deal the administration announced last year doesn&#8217;t show record amounts, either.</li>
</ul>



<ul class="wp-block-list">
<li>The president said that beef prices were &#8220;starting to come down,&#8221; but price data show little to no indication of that.</li>
</ul>



<ul class="wp-block-list">
<li>He said &#8220;the number of cattle was way down&#8221; due to an environmental restriction that he &#8220;got rid of.&#8221; But the White House pointed to the Green New Deal, a nonbinding resolution that never passed.</li>
</ul>



<ul class="wp-block-list">
<li>Trump said that $12 billion in aid provided to farmers was paid from increased tariff revenue, but the money came from the Commodity Credit Corporation, which gets regular appropriations from Congress.</li>
</ul>



<p>The president <a href="https://rollcall.com/factbase/trump/transcript/donald-trump-remarks-farmers-white-house-march-27-2026/" target="_blank" rel="noreferrer noopener">spoke</a> to farmers gathered on the South Lawn of the White House on March 27.</p>



<h2 class="wp-block-heading has-text-align-center">Farms and the Estate Tax</h2>



<p>Trump falsely claimed that “we saved 2 million American farms from extinction by virtually ending the unfair estate tax.” There aren’t even quite&nbsp;<a href="https://www.ers.usda.gov/data-products/chart-gallery/chart-detail?chartId=58268" target="_blank" rel="noreferrer noopener">2 million farms</a>&nbsp;in the U.S., and tax experts say the number of small farms that got estate tax relief from the One Big Beautiful Bill Act championed by Trump was vanishingly small.</p>



<p>Here’s what Trump said in his&nbsp;<a href="https://rollcall.com/factbase/trump/transcript/donald-trump-remarks-farmers-white-house-march-27-2026/" target="_blank" rel="noreferrer noopener">address&nbsp;</a>to farmers:</p>



<blockquote class="wp-block-quote is-layout-flow wp-block-quote-is-layout-flow">
<p><strong>Trump, March 27</strong>: Very importantly, we saved 2 million American farms from extinction by virtually ending the unfair estate tax. We’ve ended the estate tax, or as they call it, the death tax, and you can now keep your family farms in the family. … No, it was a big thing. I would see farmers and they pass away … and the children would get hit with this massive tax bill for the value of the farm. Sometimes the farm is very valuable, but the cash isn’t so readily available. And they go out to a bank and they’d borrow money and they&#8217;d borrow and borrow and borrow to pay the tax. They’d be working for 20 years to pay it off. If they had a bad season, they’d lose their farm. … And you’d have, actually, many, many suicides over it. They would actually commit suicide because they couldn’t stand the concept of losing their family farm.</p>
</blockquote>



<p>Trump did not&nbsp;<em>end</em>&nbsp;the estate tax, which is a tax on inherited assets over a certain amount. The Tax Cuts and Jobs Act, which Trump&nbsp;<a href="https://www.congress.gov/bill/115th-congress/house-bill/1" target="_blank" rel="noreferrer noopener">signed</a>&nbsp;into law in 2017, doubled the assets threshold that would trigger an estate tax. That decreased, but did&nbsp;<a href="https://www.factcheck.org/2017/12/trumps-estate-tax-spin/" target="_blank" rel="noreferrer noopener">not entirely eliminate</a>, the number of people subject to the estate tax. That provision was scheduled to expire at the end of 2025, but the One Big Beautiful Bill Act, which Trump signed into law in July 2025,&nbsp;<a href="https://taxpolicycenter.org/sites/default/files/2026-03/OBBBA_Preliminary_Assessment_2026-03-23.pdf" target="_blank" rel="noreferrer noopener">permanently extended</a>&nbsp;the more generous exemptions for the estate tax. For 2026, the <a href="https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill" target="_blank" rel="noreferrer noopener">thresholds</a> triggering the estate tax are $15 million for individuals and $30 million for married couples.</p>



<p>But more importantly, only a small fraction of farms pays any estate tax.</p>



<p>To back up Trump’s claim, a White House official pointed us to an April 2025&nbsp;<a href="https://www.fb.org/market-intel/2025-tax-cliff-death-taxes-threaten-farm-families" target="_blank" rel="noreferrer noopener">article</a>&nbsp;from the American Farm Bureau Federation, an advocate for farmers, that stated, “The estate tax, also called the ‘death’ tax, turns a time of mourning into a race against time to pay a government bill. Exactly nine months after the death of a family leader, some farm families owe the Internal Revenue Service (IRS) up to 40% of their farm’s value above an exemption limit. Without an act of Congress this year, the estate tax exemption will drop by 50% to $7.61 million on Jan. 1, 2026, putting the future of thousands of farm families at risk.”</p>



<p>The article noted that in 2024, the USDA “<a href="https://ers.usda.gov/sites/default/files/_laserfiche/publications/108636/ERR-328.pdf?v=12983" target="_blank" rel="noreferrer noopener">estimated</a> that if the estate tax exemption reverts to its pre-TCJA level, nearly twice as many farms in every sales class would have to pay estate taxes.”</p>



<p>That’s true, but according to that USDA&nbsp;<a href="https://ers.usda.gov/sites/default/files/_laserfiche/publications/108636/ERR-328.pdf?v=12983" target="_blank" rel="noreferrer noopener">estimate</a>, “the share of farm estates estimated to owe Federal estate tax would increase from 0.3 to 1.0 percent.”</p>



<p>“The story he [Trump] tells is dramatic but almost entirely untrue,”&nbsp;<a href="https://www.urban.org/author/howard-gleckman">Howard Gleckman</a>, a visiting fellow at the Urban-Brookings Tax Policy Center, told us via email.</p>



<p>Although the Tax Policy Center has not modeled the estate tax impact on farms recently, Gleckman&nbsp;<a href="https://taxpolicycenter.org/briefing-book/who-pays-estate-tax" target="_blank" rel="noreferrer noopener">noted</a>&nbsp;that “we estimated that a total of 3,960 decedents paid the estate tax in 2023. Those were total deaths, including all occupations. Since the vast majority of family farms are worth much less than $15m/$30m, the impact on farms is vanishingly low, and TPC concludes that zero small family farmers paid the tax.”</p>



<p>“It also is worth noting that any business owner subject to the estate tax has many tools to avoid the tax,” Gleckman said. “For example, they can create trusts or buy life insurance, which effectively pays the tax.”</p>



<p>In&nbsp;<a href="https://ilr.law.uiowa.edu/sites/ilr.law.uiowa.edu/files/2025-05/ILR-110-Thomas.pdf" target="_blank" rel="noreferrer noopener">an article</a>&nbsp;published in the Iowa Law Review in May 2025,&nbsp;<a href="https://law.unc.edu/people/kathleen-delaney-thomas/" target="_blank" rel="noreferrer noopener">Kathleen DeLaney Thomas</a>, a professor at the University of North Carolina Law School, explored what she called the “myth” of “the threat of taxing family farms out of existence.”</p>



<p>“In the minds of voters, the family farmer is a sympathetic taxpayer who is cash poor but holds valuable property,” Thomas wrote. “Federal taxes that are based upon property values (like a wealth tax or an estate tax), rather than on cash income, appear to pose a risk that the family farm would have to be sold to fund such a tax. Yet, there is no empirical evidence that any family farm has ever been sold in the United States to fund federal taxes.”</p>



<p>As an aside, we weren’t able to find any examples of American farmers who committed suicide because of the prospect of losing their farm due to the estate tax, let alone “many,” as Trump claimed. There was a&nbsp;<a href="https://www.bbc.com/news/articles/cx2epp4nyz8o" target="_blank" rel="noreferrer noopener">widely reported</a>&nbsp;case of a man who committed suicide in 2025 due to worry about inheritance tax changes, but that was in the United Kingdom.</p>



<h2 class="wp-block-heading has-text-align-center">Soybeans to China </h2>



<p>Trump falsely <a href="https://rollcall.com/factbase/trump/transcript/donald-trump-remarks-farmers-white-house-march-27-2026/" target="_blank" rel="noreferrer noopener">said</a> that &#8220;American soybeans are now being shipped to China in record amounts,&#8221; touting a figure that he said he negotiated with China&#8217;s president. But U.S. exports are not on track this year to reach a record. A trade deal the White House announced in November also doesn&#8217;t show an agreement for record exports. </p>


<div class="wp-block-image">
<figure class="alignleft size-full"><img loading="lazy" decoding="async" width="400" height="267" src="https://cdn.factcheck.org/UploadedFiles/WH-Tractor-400-x-267.png" alt="" class="wp-image-281687" srcset="https://cdn.factcheck.org/UploadedFiles/WH-Tractor-400-x-267.png 400w, https://cdn.factcheck.org/UploadedFiles/WH-Tractor-400-x-267-217x145.png 217w" sizes="auto, (max-width: 400px) 100vw, 400px" /><figcaption class="wp-element-caption">Farmers attending Trump&#8217;s March 27 speech at the White House. Photo by Oliver Contreras / AFP via Getty Images.</figcaption></figure></div>


<p>&#8220;Thanks to our trade deals, you&#8217;re now sending over $40 billion in American soybeans to China,&#8221; the president said. &#8220;I want to thank President Xi of China, because we had a deal at 20, and I said, &#8216;Could you do me a favor? It&#8217;s a big place, could you double it?&#8217; &#8230; He said, &#8216;All right, I&#8217;ll do it,&#8217; and you got 40 instead of 20.&#8221; Trump went on to make his claim about &#8220;record amounts&#8221; of soybeans now going to China.</p>



<p>Data from the USDA show that soybean exports to China, as of March 19, are about half the amount they were last year. &#8220;We&#8217;re not looking at record export sales, at least so far this year,&#8221; <a href="https://faculty.sites.iastate.edu/chart/" target="_blank" rel="noreferrer noopener">Chad E. Hart</a>, a professor, extension economist and crop markets specialist at Iowa State University, told us.</p>



<p><a href="https://ag.purdue.edu/department/agecon/directory.html#/mlmallor" target="_blank" rel="noreferrer noopener">Mindy L. Mallory</a>, an associate professor of agricultural economics at Purdue University, similarly said that &#8220;we are not even close to normal buying, let alone record buying.&#8221;</p>



<p>U.S. soybean exports to China totaled <a href="https://cdn.factcheck.org/UploadedFiles/USDA-data-on-soybeans-to-China-March-2026.png" target="_blank" rel="noreferrer noopener">11.2 million metric tons</a> for the marketing year as of March 19, <a href="https://apps.fas.usda.gov/esrqs/#/esr-query" target="_blank" rel="noreferrer noopener">according to the USDA data</a>. That’s about half the amount exported to China over the same period the year before, which was <a href="https://cdn.factcheck.org/UploadedFiles/USDA-data-on-soybeans-to-China-March-2025.png" target="_blank" rel="noreferrer noopener">21.8 million metric tons</a>. (The marketing year is Sept. 1 to Aug. 31, covering the harvesting of the crop and what happens to it before the subsequent harvest, Hart explained. So, last year would be Sept. 1, 2024, to Aug. 31, 2025, and the current marketing year started Sept. 1, 2025.)</p>



<p>Typically, just over half of U.S. soybean exports go to China, Mallory told us. But exports dropped considerably in 2025, due to Trump&#8217;s policy of increasing tariffs on U.S. imports from China and China&#8217;s subsequent retaliatory policies for goods it gets from the U.S. For several months, China <a href="https://www.agriculture.com/partners-china-imports-no-u-s-soybeans-for-third-month-argentine-arrivals-up-634-11874186" target="_blank" rel="noreferrer noopener">didn&#8217;t import</a> any U.S. soybeans. </p>



<p>In early November, the White House announced that Trump and Xi had made a deal on trade. A Nov. 1 White House fact sheet <a href="https://web.archive.org/web/20260401201143/https://www.whitehouse.gov/fact-sheets/2025/11/fact-sheet-president-donald-j-trump-strikes-deal-on-economic-and-trade-relations-with-china/" target="_blank" rel="noreferrer noopener">said</a>: &#8220;China will purchase at least 12 million metric tons (MMT) of U.S. soybeans during the last two months of 2025 and also purchase at least 25 MMT of U.S. soybeans in each of 2026, 2027, and 2028.&#8221;</p>



<p>Those amounts wouldn&#8217;t be records, either. Mallory said 25 million metric tons for a year would be &#8220;just below the average of the prior six years.&#8221; </p>



<p>In a <a href="https://farmdocdaily.illinois.edu/2025/11/us-china-soybean-deal-comparing-past-export-levels-and-global-market-impacts.html" target="_blank" rel="noreferrer noopener">Nov. 17 paper</a> published on farmdoc daily, a website run by the University of Illinois at Urbana-Champaign, other Purdue agriculture economists wrote, &#8220;If China purchases at least 25 million tons of U.S. soybeans in each of 2026, 2027, and 2028, that volume would still be 14% lower than the five-year average of 29 million tons of soybean shipments to China from 2020 to 2024. The ten-year average was 27 million tons.&#8221; A chart in that paper shows that, over the previous 10 years, annual exports to China only dipped below 25 million metric tons in 2019 (22.6 MMT) and 2018 (8.2 MMT), during another trade disagreement in Trump&#8217;s first term.</p>



<p>It&#8217;s unclear if Trump is suggesting that he had secured a commitment from Xi for a larger amount of exports than the White House announced. The White House didn&#8217;t respond to our request for clarification of how much China had agreed to and when it would import $40 billion of soybeans, as Trump said. When we asked about the president&#8217;s claim, a White House official said: &#8220;China has agreed to increase its purchases of U.S. soybeans by millions of metric tons, in addition to increasing purchases of other commodities.&#8221;</p>



<p>For the marketing year, Hart said, exports to China are typically in the range of $16 billion to $20 billion, depending on prices. He said the president&#8217;s $40 billion figure must be a cumulative figure for multiple years, noting that the U.S. announcement concerned export amounts for several years.   </p>



<h2 class="wp-block-heading has-text-align-center">Beef Prices</h2>



<p>Trump said that the price of beef &#8220;is starting to come down.&#8221; But there&#8217;s little to no indication of that. He went on to falsely claim that &#8220;the number of cattle was way down&#8221; due to an environmental regulation concerning &#8220;gas permeating throughout the air,&#8221; adding that &#8220;we got rid of that one, too.&#8221; A White House  official said he was referring to the Green New Deal, a nonbinding congressional resolution that didn&#8217;t pass. </p>



<p>We&#8217;ll start with beef prices. They have been high, due to several factors, which we&#8217;ll explain. The price of a pound of ground beef was an average $6.74 in February, <a href="https://data.bls.gov/timeseries/APU0000703112?amp%253bdata_tool=XGtable&amp;output_view=data&amp;include_graphs=true" target="_blank" rel="noreferrer noopener">according to Bureau of Labor Statistics data</a>. That&#8217;s down a mere penny from January, and it&#8217;s up $1.19 since January 2025. The price had gone up 52 cents from January 2024 to January 2025.</p>



<p>Uncooked beef steaks <a href="https://data.bls.gov/timeseries/APU0000FC3101" target="_blank" rel="noreferrer noopener">cost</a> $12.74 per pound in February on average. That&#8217;s up 44 cents from January and up $1.83 from January 2025. Uncooked beef roasts <a href="https://data.bls.gov/timeseries/APU0000FC2101" target="_blank" rel="noreferrer noopener">were</a> $8.93 per pound on average last month, down from a high of $9.29 in November. But the latest figure is still $1.21 more than the average price in January 2025.</p>



<p>Beef prices &#8220;are far from coming down,&#8221; <a href="https://chudymeatconsulting.com/" target="_blank" rel="noreferrer noopener">Bob Chudy,</a>&nbsp;a consultant for the beef industry, told us in an email. Chudy pointed to USDA figures for <a href="https://www.ams.usda.gov/mnreports/ams_2461.pdf" target="_blank" rel="noreferrer noopener">choice cutout</a>, which he called &#8220;the best measure of wholesale beef prices.&#8221; Using a monthly average of weekly prices the USDA provides, Chudy said that choice cutout &#8220;jumped from an average of $3.69/lb in February to $3.94/lb in March.&#8221; That&#8217;s an increase of 25 cents. &#8220;And we are going into a period of seasonally stronger demand, with spring and summer grilling season around the corner.&#8221;</p>



<p>Chudy said that &#8220;beef supplies are historically low.&nbsp;There is nothing this administration can do to reduce beef prices for the balance of 2026 and extending into 2027 and likely 2028.&nbsp;Any short term deviations to the contrary are just that.&#8221;</p>



<p>As we&#8217;ve explained before, <a href="https://www.nytimes.com/2021/08/25/us/drought.html" target="_blank" rel="noreferrer noopener">drought conditions</a> in the U.S. over the past few years affected the feed for cattle and led to a slow reduction in the cattle herd, Bernt Nelson, an agricultural economist at the American Farm Bureau Federation,&nbsp;<a href="https://www.nbcnews.com/business/consumer/high-beef-prices-will-likely-linger-even-cookout-season-ends-rcna220547" target="_blank" rel="noreferrer noopener">told</a>&nbsp;NBC News last summer. In a <a href="https://www.fb.org/market-intel/smaller-cattle-herd-creates-market-volatility" target="_blank" rel="noreferrer noopener">February Farm Bureau report</a> drawing on USDA data, Nelson said the U.S. cattle inventory on Jan. 1 was 0.3% lower than in 2025, beginning the eighth year of contraction and &#8220;with little opportunity for meaningful expansion until at least 2028.&#8221;</p>



<p>&#8220;Tighter cattle supplies will contribute to higher prices and volatility for cattle and beef in 2026,&#8221; Nelson wrote.</p>



<p>Also, last year, the USDA <a href="https://archive.is/6So3S" target="_blank" rel="noreferrer noopener">suspended</a> imports of live cattle from Mexico because of cases of <a href="https://www.aphis.usda.gov/livestock-poultry-disease/cattle/ticks/screwworm" target="_blank" rel="noreferrer noopener">New World screwworm</a>, a parasite that kills host animals. Chudy called that &#8220;a huge factor&#8221; that &#8220;has choked off a valuable supply of animals raised in USA feedlots.&#8221;</p>



<p>And there are also demand issues. Altin Kalo, head economist with the <a href="https://steinerconsulting.com/" target="_blank" rel="noreferrer noopener">Steiner Consulting Group</a>, which focuses on the food industry, told us, &#8220;Beef demand has been exceptional in recent years and has been a big contributor to the rise in beef prices in recent years. Indexes that ag economists use to track the shift in demand over time show that in 2025 demand was up 8% vs. previous year and near 27% from pre-COVID levels.&#8221; Kalo cited several factors for the increase in demand, including income and employment, high quality of beef products and a shift to higher-protein diets, and consumers eating more meals in restaurants than in the past. </p>



<p>In November, Trump <a href="https://www.politico.com/news/2025/11/20/trump-strikes-tariffs-on-brazilian-coffee-beef-and-other-foods-00663860" target="_blank" rel="noreferrer noopener">scrapped</a> 50% tariffs he had placed on Brazilian imports, including beef. </p>



<h2 class="wp-block-heading has-text-align-center">Green New Deal</h2>



<p>After mentioning prices, Trump made his claim about environmental concerns reducing the number of cattle. </p>



<blockquote class="wp-block-quote is-layout-flow wp-block-quote-is-layout-flow">
<p><strong>Trump:</strong> Beef was, it was an amazing thing, I was told by [Agriculture Secretary] Brooke [Rollins]. I said, I don&#8217;t really believe it. They wanted to have less cattle in the country for environmental reasons. &#8230; These are sick people. No, they want less cattle for environmental reasons. It has something to do with gas permeating throughout the air. And we actually &#8212; and that&#8217;s what happened. And these, the number of cattle was way down. I said, what happened? They were mandated. They were restricted for that reason. These people are crazy. But anyway, we &#8212; we got rid of that one too. That was an easy one.</p>
</blockquote>



<p>When we asked what environmental regulation Trump was referring to, a White House official told us: &#8220;President Trump is including the insane <a href="https://nypost.com/2019/02/22/aoc-explains-why-farting-cows-were-considered-in-green-new-deal/" target="_blank" rel="noreferrer noopener">Green New Scam provision</a> that sought to limit cow herds in order to reduce methane emissions,&#8221; linking to a 2019 New York Post article about the Green New Deal resolution, which was <a href="https://www.congress.gov/bill/116th-congress/house-resolution/109" target="_blank" rel="noreferrer noopener">introduced</a> by Democratic Rep. Alexandria Ocasio-Cortez that year.  </p>



<p>That resolution, which was nonbinding, never passed. The number of cattle wasn&#8217;t &#8220;mandated&#8221; or &#8220;restricted&#8221; under the resolution, so there was nothing for Trump to get rid of, either. </p>



<p>The president has made a similar claim about the Green New Deal before, <a href="https://www.factcheck.org/2019/02/the-facts-on-the-green-new-deal/" target="_blank" rel="noreferrer noopener">falsely saying</a> in 2019 that it would &#8220;eliminate&#8221; all cows. Ocasio-Cortez did express concern about greenhouse gas emissions from cows, as have other environmentalists. (Methane emissions from agricultural livestock contribute to greenhouse gas emissions, as the Environmental Protection Agency <a href="https://web.archive.org/web/20260219051822/https://www.epa.gov/ghgemissions/agriculture-sector-emissions" target="_blank" rel="noreferrer noopener">says</a>.) But as a nonbinding resolution, the Green New Deal was a broad vision for addressing climate change. If it had passed in Congress &#8212; which it didn&#8217;t then, nor when <a href="https://www.congress.gov/bill/118th-congress/house-resolution/319" target="_blank" rel="noreferrer noopener">introduced</a> in later years &#8212; lawmakers would have needed to propose separate legislation on steps to take to reach the resolution&#8217;s goals for emissions. </p>



<p>As we explained in 2019, the resolution doesn&#8217;t say anything about limiting cows. But two FAQ documents from the resolution&#8217;s supporters mentioned cows, garnering a lot of attention at the time. A&nbsp;<a href="https://assets.documentcloud.org/documents/5729035/Green-New-Deal-FAQ.pdf">fact sheet</a>&nbsp;said: “We set a goal to get to net-zero, rather than zero emissions, in 10 years because we aren’t sure that we’ll be able to fully get rid of farting cows and airplanes that fast.” A <a href="https://web.archive.org/web/20190207191119/https:/ocasio-cortez.house.gov/media/blog-posts/green-new-deal-faq">blog post</a>&nbsp;on Ocasio-Cortez’s website expressed a similar idea. </p>



<h2 class="wp-block-heading has-text-align-center">Farm Aid Not From Tariffs</h2>



<p>Trump again claimed that $12 billion in aid provided to farmers was paid from increased tariff revenue, but the funding came from regular appropriations.</p>



<p>Trump&nbsp;<a href="https://rollcall.com/factbase/trump/transcript/donald-trump-remarks-farmers-white-house-march-27-2026/" target="_blank" rel="noreferrer noopener">said</a>: “To further help farmers recovering from the Biden catastrophe, we use money taken from tariffs, the tariffs — we’ve taken in hundreds of billions of dollars from the tariffs, and as I said, we gave you $12 billion in farm relief. And that happened just recently because you were hurt by certain countries unfairly. And I said you were unfairly hurt and we gave you $12 billion and that — that made up for it.”</p>



<p>The $12 billion <a href="https://www.usda.gov/about-usda/news/press-releases/2025/12/08/trump-administration-announces-12-billion-farmer-bridge-payments-american-farmers-impacted-unfair" target="_blank" rel="noreferrer noopener">bailout</a> for American farmers came soon after China <a href="https://www.csis.org/analysis/when-trade-war-becomes-food-fight" target="_blank" rel="noreferrer noopener">slashed</a> its purchase of American soybeans in 2025 following Trump’s imposition of additional tariffs on imports from China.</p>



<p>“The Soybean Farmers of our Country are being hurt because China is, for ‘negotiating’ reasons only, not buying. We’ve made so much money on Tariffs, that we are going to take a small portion of that money, and help our Farmers,” Trump&nbsp;<a href="https://perma.cc/YJ98-PS9Z" target="_blank" rel="noreferrer noopener">posted</a>&nbsp;on Truth Social on Oct. 1.</p>



<p>But as&nbsp;<a href="https://www.factcheck.org/2026/01/trumps-tariffs-dont-come-close-to-funding-everything-hes-proposed/" target="_blank" rel="noreferrer noopener">we have written</a>, the $12 billion was paid for by the&nbsp;<a href="https://www.usda.gov/farming-and-ranching/resources-small-and-mid-sized-farmers/commodity-credit-corporation" target="_blank" rel="noreferrer noopener">Commodity Credit Corporation</a>, a government-owned corporation that&nbsp;<a href="https://www.congress.gov/crs-product/R44606" target="_blank" rel="noreferrer noopener">provides</a>&nbsp;funding for agricultural programs and gets regular&nbsp;<a href="https://usdaoig.oversight.gov/sites/default/files/reports/2025-09/06403-0007-11%20FR_508.pdf" target="_blank" rel="noreferrer noopener">appropriations</a>&nbsp;from Congress, according to a&nbsp;<a href="https://www.usda.gov/about-usda/news/press-releases/2025/12/31/usda-announces-commodity-payment-rates-farmer-bridge-assistance-program" target="_blank" rel="noreferrer noopener">press release</a>&nbsp;from the USDA.</p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<p><em>Editor’s note: FactCheck.org does not accept advertising. We rely on grants and individual donations from people like you. Please consider a donation. Credit card donations may be made through <a href="https://giving.aws.cloud.upenn.edu/?fastStart=simpleForm&amp;program=ANS&amp;fund=602014" target="_blank" rel="noreferrer noopener">our “Donate” page</a>. If you prefer to give by check, send to: FactCheck.org, Annenberg Public Policy Center, P.O. Box 58100, Philadelphia, PA 19102. </em></p>
<p>The post <a href="https://www.factcheck.org/2026/04/trump-fumbles-the-facts-with-farmers/">Trump Fumbles the Facts with Farmers</a> appeared first on <a href="https://www.factcheck.org">FactCheck.org</a>.</p>
]]></content:encoded>
					
		
		
			</item>
		<item>
		<title>FactChecking Trump&#8217;s Prime-Time Address on Iran</title>
		<link>https://www.factcheck.org/2026/04/factchecking-trumps-prime-time-address-on-iran/</link>
		
		<dc:creator><![CDATA[Lori Robertson]]></dc:creator>
		<pubDate>Thu, 02 Apr 2026 21:29:45 +0000</pubDate>
				<category><![CDATA[FactCheck Posts]]></category>
		<category><![CDATA[Featured Posts]]></category>
		<guid isPermaLink="false">https://www.factcheck.org/?p=281584</guid>

					<description><![CDATA[<p><img width="640" height="273" src="https://cdn.factcheck.org/UploadedFiles/Trump-Iran-Speech-720-x-307.png" class="attachment-medium_large size-medium_large wp-post-image" alt="" style="float:left; margin:0 15px 15px 0;" decoding="async" loading="lazy" srcset="https://cdn.factcheck.org/UploadedFiles/Trump-Iran-Speech-720-x-307.png 720w, https://cdn.factcheck.org/UploadedFiles/Trump-Iran-Speech-720-x-307-340x145.png 340w" sizes="auto, (max-width: 640px) 100vw, 640px" />A month after the U.S. and Israel launched airstrikes on Iran, President Donald Trump addressed the nation in a prime-time speech on April 1, saying the military operation was "getting very close" to completing its mission. Trump repeated some false and questionable claims we've written about before.</p>
<p>The post <a href="https://www.factcheck.org/2026/04/factchecking-trumps-prime-time-address-on-iran/">FactChecking Trump&#8217;s Prime-Time Address on Iran</a> appeared first on <a href="https://www.factcheck.org">FactCheck.org</a>.</p>
]]></description>
										<content:encoded><![CDATA[<img width="640" height="273" src="https://cdn.factcheck.org/UploadedFiles/Trump-Iran-Speech-720-x-307.png" class="attachment-medium_large size-medium_large wp-post-image" alt="" style="float:left; margin:0 15px 15px 0;" decoding="async" loading="lazy" srcset="https://cdn.factcheck.org/UploadedFiles/Trump-Iran-Speech-720-x-307.png 720w, https://cdn.factcheck.org/UploadedFiles/Trump-Iran-Speech-720-x-307-340x145.png 340w" sizes="auto, (max-width: 640px) 100vw, 640px" />
<p>A month after the U.S. and Israel launched airstrikes on Iran, President Donald Trump addressed the nation in a prime-time speech on April 1, saying the military operation was &#8220;getting very close&#8221; to completing its mission. Trump repeated some false and questionable claims we&#8217;ve written about before.</p>



<ul class="wp-block-list">
<li>Trump <a href="https://rollcall.com/factbase/trump/transcript/donald-trump-remarks-address-prime-time-iran-april-1-2026/" target="_blank" rel="noreferrer noopener">said</a> the U.S. &#8220;totally obliterated&#8221; three nuclear facility sites in Iran last June. Experts and a classified U.S. intelligence report said the sites were damaged and Iran&#8217;s uranium enrichment program was set back, but the sites and the country&#8217;s nuclear capabilities weren’t completely destroyed.</li>
</ul>



<ul class="wp-block-list">
<li>The president said that Iran was &#8220;right at the doorstep&#8221; of &#8220;a nuclear bomb.&#8221; Arms control experts have said that there&#8217;s a lack of evidence that Iran was rebuilding its nuclear program before the U.S./Israeli military operation and that a nuclear weapon wasn&#8217;t &#8220;imminent.&#8221;</li>
</ul>



<ul class="wp-block-list">
<li>Trump claimed that before the U.S. attacked, Iran &#8220;would soon have had missiles that could reach the American homeland,&#8221; but arms control experts have disputed Trump&#8217;s claim.</li>
</ul>



<ul class="wp-block-list">
<li>Trump criticized an Obama-era agreement that he said &#8220;would have led to a colossal arsenal of massive nuclear weapons for Iran&#8221; if Trump hadn&#8217;t ended it in his first term. That&#8217;s Trump&#8217;s opinion. One arms control group estimated the withdrawal from the agreement sped up the time it would take for Iran to produce weapons-grade uranium.</li>
</ul>



<ul class="wp-block-list">
<li>The president falsely suggested that the U.S. became the &#8220;No. 1 producer of oil and gas on the planet&#8221; because of his leadership. The U.S. became the top producer of both natural gas and petroleum, which includes crude oil, even before Trump&#8217;s first term as president.</li>
</ul>



<ul class="wp-block-list">
<li>He falsely claimed to have turned a &#8220;dead and crippled&#8221; economy into the &#8220;strongest in history.&#8221; Many economists measure the health of an economy by the rate of growth in real gross domestic product, which was lower in the U.S. in 2025 than it was the year before Trump started his second term.</li>
</ul>



<h2 class="wp-block-heading has-text-align-center">Last June&#8217;s Airstrikes</h2>



<p>The president <a href="https://rollcall.com/factbase/trump/transcript/donald-trump-remarks-address-prime-time-iran-april-1-2026/" target="_blank" rel="noreferrer noopener">said</a> the U.S. &#8220;totally obliterated&#8221; three nuclear facility sites in Iran last June in a U.S. airstrike operation called Midnight Hammer. Experts and a classified U.S. intelligence report said the sites were damaged and Iran&#8217;s uranium enrichment program was set back, but the sites and the country&#8217;s nuclear capabilities weren’t completely destroyed.</p>



<p>In a March 18 congressional hearing, however, Director of National Intelligence Tulsi Gabbard backed up Trump&#8217;s claim, <a href="https://www.youtube.com/live/F_Ny5Us_rvw?si=BRlK4YL5AAKN8mxm&amp;t=8112" target="_blank" rel="noreferrer noopener">saying</a> that it was the assessment of the Intelligence Community that last year&#8217;s airstrikes &#8220;obliterated&#8221; Iran&#8217;s nuclear enrichment program.</p>



<p>Trump has repeatedly used the description &#8220;totally obliterated&#8221; in describing the success of the operation, starting the night of the attack in a <a href="https://www.nbcnews.com/now/video/watch-president-trump-s-full-speech-after-u-s-strikes-nuclear-sites-in-iran-242042949516" target="_blank" rel="noreferrer noopener">televised address</a>. As <a href="https://www.factcheck.org/2025/06/iranian-nuclear-program-damaged-not-obliterated-by-u-s-attack/" target="_blank" rel="noreferrer noopener">we&#8217;ve written</a>, a five-page, preliminary, classified report from the Pentagon&#8217;s Defense Intelligence Agency said the bombing sealed off entrances of two facilities and set back Iran’s nuclear program by a few months,&nbsp;<a href="https://www.cnn.com/2025/06/24/politics/intel-assessment-us-strikes-iran-nuclear-sites" target="_blank" rel="noreferrer noopener">CNN</a>&nbsp;and the&nbsp;<a href="https://www.nytimes.com/2025/06/24/us/politics/iran-nuclear-sites.html?campaign_id=60&amp;emc=edit_na_20250624&amp;instance_id=157175&amp;nl=breaking-news&amp;regi_id=248848251&amp;segment_id=200569&amp;user_id=e5b77ed2dcc338330d0bbc81341e1102" target="_blank" rel="noreferrer noopener">New York Times</a>&nbsp;reported last June. </p>



<p>On June 25, CIA Director John Ratcliffe issued a&nbsp;<a href="https://archive.is/nquub">statement</a>&nbsp;saying it would take &#8220;years&#8221; to rebuild key facilities. “CIA can confirm that a body of credible intelligence indicates Iran’s Nuclear Program has been severely damaged by the recent, targeted strikes,&#8221; he said. &#8220;This includes new intelligence from a historically reliable and accurate source/method that several key Iranian nuclear facilities were destroyed and would have to be rebuilt over the course of years.”</p>



<p><a href="https://www.armscontrol.org/about/Daryl_Kimball" target="_blank" rel="noreferrer noopener">Daryl G. Kimball</a>, executive director of the Arms Control Association, a nonpartisan organization that provides analysis on arms control and national security issues, told us in March that “it is clear that it would take Iran years to fully rebuild its enrichment plants” that were “severely damaged&#8221; in June. But the operation didn&#8217;t &#8220;remove or help account for 400 kilograms of uranium enriched to 60 percent U-235 that Iran already had stockpiled, and that the IAEA [International Atomic Energy Agency] reported this week is buried [at] Iran’s nuclear complex near Isfahan,” one of the three sites hit in last year&#8217;s airstrikes. </p>



<p>To be weapons-grade, the uranium would need to be enriched to 90%. </p>



<h2 class="wp-block-heading has-text-align-center">Iran&#8217;s Nuclear Capability</h2>



<p>The president went on to say that Iran &#8220;sought to rebuild their nuclear program at a totally different location, making clear they had no intention of abandoning their pursuit of nuclear weapons.&#8221; He said the country was &#8220;right at the doorstep&#8221; of &#8220;a nuclear bomb, a nuclear weapon, a nuclear weapon like nobody&#8217;s ever seen before.&#8221;</p>



<p>The phrase &#8220;right at the doorstep&#8221; is vague, but arms control experts have said that there&#8217;s a lack of evidence that Iran was rebuilding its nuclear program before the U.S./Israeli military operation and that a nuclear weapon wasn&#8217;t &#8220;imminent.&#8221;</p>



<p>As <a href="https://www.factcheck.org/2026/03/assessing-trumps-claims-on-irans-nuclear-and-missile-capabilities/" target="_blank" rel="noreferrer noopener">we reported last month</a>, Kimball told us that “[w]hile Iran’s nuclear program remains a medium- to long-term proliferation risk, there was and is no imminent Iranian nuclear threat; Iran is not close to ‘weaponizing’ its nuclear material so as to justify breaking off negotiations and launching the U.S.-Israeli attack.”</p>



<p><a href="https://fas.org/expert/eliana-johns/" target="_blank" rel="noreferrer noopener">Eliana Johns</a>, a senior research associate with the nuclear information project at the Federation of American Scientists, told us that “if Iran&nbsp;enriches uranium to weapons-grade, they will need to weaponize the material and develop a nuclear device with other sensitive components. It’s relatively easy to put various payloads on a missile; however, while Iran certainly has ballistic missiles that could theoretically be used for this purpose, there are still challenges with designing a nuclear device that can be mated with the intended missile, will detonate when desired, survive reentry, and arrive accurately at its target.”</p>



<p>In her <a href="https://web.archive.org/web/20260318165448/https://www.intelligence.senate.gov/wp-content/uploads/2026/03/os-gabbard-031826.pdf" target="_blank" rel="noreferrer noopener">prepared remarks</a> for the March 18 congressional hearing, Gabbard said: &#8220;As a result of Operation Midnight Hammer, Iran’s nuclear enrichment program was obliterated. There has been no efforts since then to try to rebuild their enrichment capability. The entrances to the underground facilities that were bombed have been buried and shuttered with cement. We continue to monitor for any early indicators on what position the current or any new leadership in Iran will take with regard to authorizing a nuclear weapons program.&#8221;</p>



<p>Asked by Democratic Sen. Jon Ossoff whether it was &#8220;the assessment of the Intelligence Community that there was an &#8216;imminent nuclear threat posed by the Iranian regime,'&#8221; as the White House <a href="https://web.archive.org/web/20260330161013/https://www.whitehouse.gov/releases/2026/03/peace-through-strength-president-trump-launches-operation-epic-fury-to-crush-iranian-regime-end-nuclear-threat/" target="_blank" rel="noreferrer noopener">had said</a>, Gabbard <a href="https://www.youtube.com/live/F_Ny5Us_rvw?si=36orqIrPb5vqLVTX&amp;t=8149" target="_blank" rel="noreferrer noopener">said</a>, &#8220;The intelligence community assessed that Iran maintained the intention to rebuild and to continue to grow their nuclear enrichment capability.&#8221; Under repeated questioning on the issue, Gabbard said that the president was &#8220;the only person who can determine what is and is not an imminent threat.&#8221;</p>



<h2 class="wp-block-heading has-text-align-center">Iranian Missile Range</h2>



<p>Trump claimed that before the U.S. attacked, Iran was &#8220;rapidly building a vast stockpile of conventional ballistic missiles, and would soon have had missiles that could reach the American homeland, Europe and virtually any other place on earth.&#8221; But arms control experts have disputed Trump&#8217;s claim about missiles &#8220;soon&#8221; reaching the U.S.</p>



<p>As <a href="https://www.factcheck.org/2026/03/assessing-trumps-claims-on-irans-nuclear-and-missile-capabilities/">we wrote</a> when Trump made a similar comment in his State of the Union Address on Feb. 24, while “soon” is a subjective term, experts say the threat of Iran developing an intercontinental ballistic missile capable of reaching the mainland of the United States was not particularly imminent. One expert put the time frame at several years, while others have said it would take Iran a decade or more to develop a functioning ICBM.</p>



<p>“Iran’s missile arsenal remains one of the pillars of its security strategy,” <a href="https://armscontrolcenter.org/about/meet-the-staff/emma-sandifer/" target="_blank" rel="noreferrer noopener">Emma Sandifer</a>, program coordinator at the nonpartisan Center for Arms Control and Non-Proliferation, told us in an email. “However, there is little evidence that Iran could build missiles that reach the United States in the near future. Recent estimates determined that not only does Iran have no intercontinental ballistic missile capability, but the country appears to have maintained its self-imposed missile range limit of 2,000 km.”</p>



<p>Pushing back against the president&#8217;s claim, some Democrats have pointed to a Defense Intelligence Agency <a href="https://www.dia.mil/Portals/110/Documents/News/golden_dome.pdf" target="_blank" rel="noreferrer noopener">report</a> released last May that stated, “Iran has space launch vehicles it could use to develop a militarily-viable ICBM by 2035 should Tehran decide to pursue the capability.” The report, which assessed missile threats that might be faced by a Trump-proposed “<a href="https://www.factcheck.org/2025/03/factchecking-trumps-address-to-congress-2/" target="_blank" rel="noreferrer noopener">Golden Dome</a>” missile defense shield, projected Iran could have 60 ICBMs by 2035.</p>



<p>“So basically, the U.S. intelligence agencies have said that Iran would need 10 years to build ICBMs capable of hitting the United States militarily if they chose to do so,” <a href="https://www.defensepriorities.org/people/rosemary-kelanic/" target="_blank" rel="noreferrer noopener">Rosemary Kelanic</a>, director of the Middle East program at Defense Priorities, a Washington-based think tank advocating restraint in U.S. foreign policy, told us. “And it did not necessarily say that there was evidence that Iran had chosen to do so.&#8221;</p>



<p>However, Jeffrey Lewis, an expert on global security at Middlebury College, warned that many were misreading the context of the DIA report.</p>



<p>“The question wasn’t ‘When will Iran have an ICBM’, it was ‘What will the threat environment look like in 2035 when Golden Dome is to be fully operational,&#8217;” Lewis <a href="https://x.com/ArmsControlWonk/status/2026789826088124651">wrote</a> on X.</p>



<p>A March 2 <a href="https://www.wsj.com/world/middle-east/trumps-case-for-war-with-iran-faces-growing-scrutiny-96648cb9" target="_blank" rel="noreferrer noopener">article</a> in the Wall Street Journal reported that Lewis “said that even if Tehran wanted to pursue building the weapons, it would likely take two to three years at least to build a single missile based on the history of how other nations developed similar missiles.”</p>



<p>“US officials have been saying since the late 1990s that Iran is a little over a decade away from developing an ICBM and is pursuing that capability,” Johns, of the Federation of American Scientists, told us. “However, building an ICBM capable of accurately striking the US mainland would require overcoming substantial technical hurdles with propulsion, guidance, and reentry, among other things. And there is little evidence to indicate that Iran&nbsp;has this capacity or intends to pursue it.&#8221;</p>



<h2 class="wp-block-heading has-text-align-center">Obama Nuclear Deal</h2>



<p>The president again criticized a multilateral nuclear agreement negotiated by former President Barack Obama’s administration that was intended to restrict Iran’s uranium enrichment program. Trump, who withdrew the U.S. from the agreement in his first term, said the nuclear deal “would have led to a colossal arsenal of massive nuclear weapons for Iran. They would have had them years ago, and they would have used them.”</p>



<p>As we’ve&nbsp;<a href="https://www.factcheck.org/2026/03/trumps-claim-about-the-obama-nuclear-deal-and-irans-nuclear-development/" target="_blank" rel="noreferrer noopener">written before</a>, we can’t say what would have happened if the agreement had remained in place, and Trump noted that this was his “opinion.” But the deal, called the&nbsp;<a href="https://2009-2017.state.gov/e/eb/tfs/spi/iran/jcpoa/" target="_blank" rel="noreferrer noopener">Joint Comprehensive Plan of Action</a>&nbsp;and also signed by China, France, Russia, the United Kingdom and Germany, put restrictions on uranium enrichment by Iran for 15 years and required inspections of Iran’s nuclear facilities. In exchange for Iran abiding by the deal, the other countries agreed to lift sanctions on Iran.</p>



<p>The agreement took effect in 2016, but Trump withdrew the U.S. from it in 2018.</p>



<p>The Center for Arms Control and Non-Proliferation&nbsp;<a href="https://armscontrolcenter.org/the-iran-deal-then-and-now/" target="_blank" rel="noreferrer noopener">estimated</a>&nbsp;that Trump withdrawing from the agreement led to Iran accelerating its nuclear program. As of November 2024, the center estimated that the “breakout time,” or the time Iran would need, if it chose to do so, to produce weapons-grade uranium that could then be used for one bomb, was two to three months before the nuclear agreement and was 12-plus months during the agreement. After the U.S. withdrew, the breakout time was a couple of weeks.</p>



<p>However, as&nbsp;<a href="https://www.factcheck.org/2026/03/assessing-trumps-claims-on-irans-nuclear-and-missile-capabilities/" target="_blank" rel="noreferrer noopener">we’ve explained</a>, after producing the highly enriched uranium, it would take much longer for Iran to develop a nuclear weapon.</p>



<p>Trump also said that “Obama gave them $1.7 billion in cash … in an attempt to buy their respect and loyalty but it didn’t work.” As <a href="https://www.factcheck.org/2016/09/factchecking-the-first-debate/" target="_blank" rel="noreferrer noopener">we explained</a> in a 2016 article, the $1.7 billion payment, made in 2016, settled a claim that Iran had filed against the U.S. in an international tribunal in The Hague. It concerned a decades-old dispute over Iran paying the U.S. $400 million for military equipment, and the U.S. refusing to provide it after the Shah of Iran was overthrown during the Iranian Revolution in 1979.</p>



<p>The $1.7 billion included the original $400 million and “a roughly $1.3 billion compromise on the interest,”&nbsp;<a href="https://web.archive.org/web/20160330100626/https://www.state.gov/secretary/remarks/2016/01/251338.htm" target="_blank" rel="noreferrer noopener">according to</a>&nbsp;a statement by John Kerry, the secretary of state at the time.</p>



<h2 class="wp-block-heading has-text-align-center">Oil and Gas</h2>



<p>Trump falsely suggested that the U.S. became the world&#8217;s top producer of oil and natural gas because of him. </p>



<p>&#8220;Under my leadership, we are No. 1 producer of oil and gas on the planet, without even discussing the millions of barrels that we&#8217;re getting from Venezuela,&#8221; Trump said. &#8220;Because of the Trump administration&#8217;s policies, we produce more oil and gas than Saudi Arabia and Russia combined. Think of that. Saudi Arabia and Russia combined, and that number will soon be substantially higher than that.&#8221;</p>



<p>As <a href="https://www.factcheck.org/2018/11/obamas-misleading-oil-boast/" target="_blank" rel="noreferrer noopener">we&#8217;ve written</a>, the U.S. has been the world&#8217;s No. 1 producer of <a href="https://www.eia.gov/international/data/world/natural-gas/dry-natural-gas-production?pd=5&amp;p=0000000000000000000000000000000000g&amp;u=0&amp;f=A&amp;v=mapbubble&amp;a=-&amp;i=none&amp;vo=value&amp;t=C&amp;g=00000000000000000000000000000000000000000000000001&amp;l=249-ruvvvvvfvtvnvv1vrvvvvfvvvvvvfvvvou20evvvvvvvvvvnvvvs0008&amp;s=94694400000&amp;e=1735689600000&amp;ev=false" target="_blank" rel="noreferrer noopener">petroleum</a>, which includes both crude oil and refined petroleum products, such as gasoline, since 2013, and it has produced the most <a href="https://www.eia.gov/international/data/world/natural-gas/dry-natural-gas-production?pd=5&amp;p=00000000000000000000000000000000002&amp;u=0&amp;f=A&amp;v=mapbubble&amp;a=-&amp;i=none&amp;vo=value&amp;t=C&amp;g=00000000000000000000000000000000000000000000000001&amp;l=249-ruvvvvvfvtvnvv1vrvvvvfvvvvvvfvvvou20evvvvvvvvvvnvvvs0008&amp;s=94694400000&amp;e=1735689600000&amp;ev=false" target="_blank" rel="noreferrer noopener">crude oil</a>, including lease condensate, since 2018, as was long predicted. The International Energy Agency said in a <a href="https://web.archive.org/web/20121113124930/https://www.iea.org/publications/freepublications/publication/English.pdf" target="_blank" rel="noreferrer noopener">2012 energy outlook report</a> that the U.S. was projected to become &#8220;the largest global oil producer&#8221; by &#8220;around 2020&#8221; due to advances in shale extraction technology. </p>



<p>Meanwhile, the U.S. has been the leader in natural gas production even longer &#8212; since 2009, <a href="https://www.eia.gov/international/data/world/natural-gas/dry-natural-gas-production?pd=3002&amp;p=00g&amp;u=0&amp;f=A&amp;v=mapbubble&amp;a=-&amp;i=none&amp;vo=value&amp;vb=10&amp;t=C&amp;g=00000000000000000000000000000000000000000000000001&amp;l=249-ruvvvvvfvtvnvv1vrvvvvfvvvvvvfvvvou20evvvvvvvvvvnvvvs0008&amp;s=315532800000&amp;e=1704067200000&amp;ev=true" target="_blank" rel="noreferrer noopener">according to</a> the U.S. Energy Information Administration. The U.S. overtook Russia to become the top producer of natural gas, and it has produced more of it than Russia and Saudi Arabia, combined, in all but one year <a href="https://www.eia.gov/international/data/world/natural-gas/dry-natural-gas-production?pd=3002&amp;p=00g&amp;u=0&amp;f=A&amp;v=mapbubble&amp;a=-&amp;i=none&amp;vo=value&amp;vb=10&amp;t=C&amp;g=none&amp;l=249-000000000000000000000000000000000000000500000002&amp;s=315532800000&amp;e=1704067200000&amp;ev=true" target="_blank" rel="noreferrer noopener">since 2014</a>.</p>



<p>Saudi Arabia and Russia had produced the most <a href="https://www.eia.gov/international/data/world/natural-gas/dry-natural-gas-production?pd=5&amp;p=0000000000000000000000000000000000g&amp;u=0&amp;f=A&amp;v=mapbubble&amp;a=-&amp;i=none&amp;vo=value&amp;t=C&amp;g=00000000000000000000000000000000000000000000000001&amp;l=249-ruvvvvvfvtvnvv1vrvvvvfvvvvvvfvvvou20evvvvvvvvvvnvvvs0008&amp;s=94694400000&amp;e=1735689600000&amp;ev=false" target="_blank" rel="noreferrer noopener">petroleum</a> and <a href="https://www.eia.gov/international/data/world/natural-gas/dry-natural-gas-production?pd=5&amp;p=00000000000000000000000000000000002&amp;u=0&amp;f=A&amp;v=mapbubble&amp;a=-&amp;i=none&amp;vo=value&amp;t=C&amp;g=00000000000000000000000000000000000000000000000001&amp;l=249-ruvvvvvfvtvnvv1vrvvvvfvvvvvvfvvvou20evvvvvvvvvvnvvvs0008&amp;s=94694400000&amp;e=1735689600000&amp;ev=false" target="_blank" rel="noreferrer noopener">crude oil</a> until the U.S. surpassed them years ago. The U.S. has produced more petroleum than Saudi Arabia and Russia together <a href="https://www.eia.gov/international/data/world/natural-gas/dry-natural-gas-production?pd=5&amp;p=0000000000000000000000000000000000g&amp;u=0&amp;f=A&amp;v=mapbubble&amp;a=-&amp;i=none&amp;vo=value&amp;t=C&amp;g=none&amp;l=249-000000000000000000000000000000000000000500000002&amp;s=1009843200000&amp;e=1735689600000&amp;ev=false" target="_blank" rel="noreferrer noopener">since 2024</a>, but it <a href="https://www.eia.gov/international/data/world/natural-gas/dry-natural-gas-production?pd=5&amp;p=00000000000000000000000000000000002&amp;u=0&amp;f=A&amp;v=mapbubble&amp;a=-&amp;i=none&amp;vo=value&amp;t=C&amp;g=none&amp;l=249-000000000000000000000000000000000000000500000002&amp;s=94694400000&amp;e=1735689600000&amp;ev=false" target="_blank" rel="noreferrer noopener">does not</a> produce more crude oil than those two countries combined.</p>



<h2 class="wp-block-heading has-text-align-center">The Economy</h2>



<p>Trump repeated his false claims about turning around a country that was &#8220;dead and crippled&#8221; economically.</p>



<p>&#8220;We built the strongest economy in history,&#8221; he said. &#8220;We&#8217;re going through it right now, the strongest in history. In one year, we&#8217;ve taken a dead and crippled country, I hate to say that, but we were a dead and crippled country after the last administration, and made it the hottest country anywhere in the world by far, with no inflation, record-setting investments coming into the United States over $18 trillion and the highest stock market ever, with 53 all-time record highs in just one year.&#8221;</p>



<p>Trump <a href="https://www.factcheck.org/2020/02/factchecking-the-state-of-the-union-3/" target="_blank" rel="noreferrer noopener">didn&#8217;t</a> <a href="https://www.factcheck.org/2021/01/factchecking-trumps-farewell-remarks/" target="_blank" rel="noreferrer noopener">create</a> the &#8220;strongest&#8221; economy in his first or second term as president. Economists <a href="https://www.imf.org/en/publications/fandd/issues/series/back-to-basics/gross-domestic-product-gdp" target="_blank" rel="noreferrer noopener">generally measure</a> a nation’s health by the growth in real (meaning inflation-adjusted) gross domestic product. In his first year back in office, the Bureau of Economic Analysis <a href="https://apps.bea.gov/iTable/?reqid=19&amp;step=2&amp;isuri=1&amp;categories=survey&amp;_gl=1*sn2p5o*_ga*MjA0NDMwMzg2OS4xNzY2MTc1OTM5*_ga_J4698JNNFT*czE3NzA4MTMzNjIkbzE2JGcxJHQxNzcwODEzNjI4JGo1NiRsMCRoMA..#eyJhcHBpZCI6MTksInN0ZXBzIjpbMSwyLDMsM10sImRhdGEiOltbImNhdGVnb3JpZXMiLCJTdXJ2ZXkiXSxbIk5JUEFfVGFibGVfTGlzdCIsIjEiXSxbIkZpcnN0X1llYXIiLCIxOTMwIl0sWyJMYXN0X1llYXIiLCIyMDI1Il0sWyJTY2FsZSIsIjAiXSxbIlNlcmllcyIsIkEiXV19" target="_blank" rel="noreferrer noopener">said</a> that real GDP grew at an annual rate of 2.1% in 2025, which was down from the annual rate of 2.8% in 2024 under his predecessor.</p>



<p>In addition, as of February, the unemployment rate in the U.S. had increased to 4.4% &#8212; up from 4% when Trump took office in January 2025, <a href="https://data.bls.gov/timeseries/LNS14000000" target="_blank" rel="noreferrer noopener">according to</a> the Bureau of Labor Statistics.</p>



<p>There is also still inflation, even though the <a href="https://www.bls.gov/charts/consumer-price-index/consumer-price-index-by-category-line-chart.htm" target="_blank" rel="noreferrer noopener">annualized rate</a>, based on the Consumer Price Index, did decline from 3% in January 2025 to 2.4% as of February. Overall prices may have increased further since then. The Federal Reserve Bank of Cleveland is <a href="https://www.clevelandfed.org/indicators-and-data/inflation-nowcasting" target="_blank" rel="noreferrer noopener">predicting</a> that the annual inflation rate in March was back up to 3%, largely because of the impact that the U.S. and Israeli war with Iran is having on energy prices.</p>



<p>And Trump continues to inflate the total amount of investments he has secured from foreign companies and countries. The White House&#8217;s own website puts the figure at <a href="https://perma.cc/2ZLM-QDP6" target="_blank" rel="noreferrer noopener">$10.5 trillion</a> &#8212; not $18 trillion. But as <a href="https://www.factcheck.org/2025/12/factchecking-trumps-economic-speech/" target="_blank" rel="noreferrer noopener">we’ve written</a>, even that number cannot be substantiated because it includes pledges and planned investments that may not materialize, as well as some investments that may not be due to Trump.</p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<p><em>Editor’s note: FactCheck.org does not accept advertising. We rely on grants and individual donations from people like you. Please consider a donation. Credit card donations may be made through <a href="https://giving.aws.cloud.upenn.edu/?fastStart=simpleForm&amp;program=ANS&amp;fund=602014" target="_blank" rel="noreferrer noopener">our “Donate” page</a>. If you prefer to give by check, send to: FactCheck.org, Annenberg Public Policy Center, P.O. Box 58100, Philadelphia, PA 19102. </em></p>
<p>The post <a href="https://www.factcheck.org/2026/04/factchecking-trumps-prime-time-address-on-iran/">FactChecking Trump&#8217;s Prime-Time Address on Iran</a> appeared first on <a href="https://www.factcheck.org">FactCheck.org</a>.</p>
]]></content:encoded>
					
		
		
			</item>
		<item>
		<title>Happy International Fact-Checking Day</title>
		<link>https://www.factcheck.org/2026/04/happy-international-fact-checking-day/</link>
		
		<dc:creator><![CDATA[FactCheck.org]]></dc:creator>
		<pubDate>Thu, 02 Apr 2026 17:53:59 +0000</pubDate>
				<category><![CDATA[FactCheck Posts]]></category>
		<guid isPermaLink="false">https://www.factcheck.org/?p=281575</guid>

					<description><![CDATA[<p><img width="640" height="362" src="https://cdn.factcheck.org/UploadedFiles/Screenshot-2026-04-02-at-1.03.04-PM-768x434.png" class="attachment-medium_large size-medium_large wp-post-image" alt="" style="float:left; margin:0 15px 15px 0;" decoding="async" loading="lazy" srcset="https://cdn.factcheck.org/UploadedFiles/Screenshot-2026-04-02-at-1.03.04-PM-768x434.png 768w, https://cdn.factcheck.org/UploadedFiles/Screenshot-2026-04-02-at-1.03.04-PM-256x145.png 256w, https://cdn.factcheck.org/UploadedFiles/Screenshot-2026-04-02-at-1.03.04-PM-628x355.png 628w, https://cdn.factcheck.org/UploadedFiles/Screenshot-2026-04-02-at-1.03.04-PM.png 884w" sizes="auto, (max-width: 640px) 100vw, 640px" />April 2 is International Fact-Checking Day. To commemorate it, we produced a video of various mentions of our work over the years by politicians of both parties. </p>
<p>The post <a href="https://www.factcheck.org/2026/04/happy-international-fact-checking-day/">Happy International Fact-Checking Day</a> appeared first on <a href="https://www.factcheck.org">FactCheck.org</a>.</p>
]]></description>
										<content:encoded><![CDATA[<img width="640" height="362" src="https://cdn.factcheck.org/UploadedFiles/Screenshot-2026-04-02-at-1.03.04-PM-768x434.png" class="attachment-medium_large size-medium_large wp-post-image" alt="" style="float:left; margin:0 15px 15px 0;" decoding="async" loading="lazy" srcset="https://cdn.factcheck.org/UploadedFiles/Screenshot-2026-04-02-at-1.03.04-PM-768x434.png 768w, https://cdn.factcheck.org/UploadedFiles/Screenshot-2026-04-02-at-1.03.04-PM-256x145.png 256w, https://cdn.factcheck.org/UploadedFiles/Screenshot-2026-04-02-at-1.03.04-PM-628x355.png 628w, https://cdn.factcheck.org/UploadedFiles/Screenshot-2026-04-02-at-1.03.04-PM.png 884w" sizes="auto, (max-width: 640px) 100vw, 640px" />
<p>April 2 is International Fact-Checking Day, purposefully set the day after April Fools&#8217; Day (when mistruths are encouraged). The day was launched in 2016 by the International Fact-Checking Network, which calls it &#8220;a global celebration of truth and accuracy.&#8221;</p>



<p>This year&#8217;s International Fact-Checking Day theme is: &#8220;We Stand for Facts.&#8221; </p>



<p>We&#8217;ve been doing that for more than 20 years. FactCheck.org has been holding politicians accountable for the claims they make &#8212; and providing the facts to our readers &#8212; since our launch in 2003. </p>



<p>To commemorate this day, we gathered various mentions of our work over the years by politicians of both parties. Social Media Manager Josh Diehl searched the Congressional Record and dug up clips from C-Span to produce it. We include, of course, then-Vice President Dick Cheney, during a 2004 vice presidential debate, mistakenly calling us “FactCheck.com” (instead of FactCheck.org), a mention that nonetheless essentially put us on the map. Since then, lawmakers have periodically cited our work on the House or Senate floor.</p>



<iframe loading="lazy" width="560" height="315" src="https://www.youtube.com/embed/_0h2SsjuOE4?si=iTRD-lFOlzcoy_ND" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>



<p>FactCheck.org is a <a href="https://ifcncodeofprinciples.poynter.org/signatories" target="_blank" rel="noreferrer noopener">signatory</a> of the International Fact-Checking Network, along with more than 180 fact-checking organizations around the world. Signatories adhere to a code of journalistic ethics and principles rooted in nonpartisan and transparent work. FactCheck.org Director Lori Robertson is a member of the <a href="https://ifcncodeofprinciples.poynter.org/advisory-board" target="_blank" rel="noreferrer noopener">IFCN advisory board</a>. </p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<p><em>Editor’s note: FactCheck.org does not accept advertising. We rely on grants and individual donations from people like you. Please consider a donation. Credit card donations may be made through <a href="https://giving.aws.cloud.upenn.edu/?fastStart=simpleForm&amp;program=ANS&amp;fund=602014" target="_blank" rel="noreferrer noopener">our “Donate” page</a>. If you prefer to give by check, send to: FactCheck.org, Annenberg Public Policy Center, P.O. Box 58100, Philadelphia, PA 19102. </em></p>



<p></p>
<p>The post <a href="https://www.factcheck.org/2026/04/happy-international-fact-checking-day/">Happy International Fact-Checking Day</a> appeared first on <a href="https://www.factcheck.org">FactCheck.org</a>.</p>
]]></content:encoded>
					
		
		
			</item>
		<item>
		<title>We Could Win a Webby with Your Vote</title>
		<link>https://www.factcheck.org/2026/04/we-could-win-a-webby-with-your-vote/</link>
		
		<dc:creator><![CDATA[FactCheck.org]]></dc:creator>
		<pubDate>Wed, 01 Apr 2026 14:38:23 +0000</pubDate>
				<category><![CDATA[FactCheck Posts]]></category>
		<category><![CDATA[Featured Posts]]></category>
		<category><![CDATA[Webbys]]></category>
		<guid isPermaLink="false">https://www.factcheck.org/?p=281510</guid>

					<description><![CDATA[<p><img width="640" height="273" src="https://cdn.factcheck.org/UploadedFiles/Webby-720-x-307.png" class="attachment-medium_large size-medium_large wp-post-image" alt="" style="float:left; margin:0 15px 15px 0;" decoding="async" loading="lazy" srcset="https://cdn.factcheck.org/UploadedFiles/Webby-720-x-307.png 720w, https://cdn.factcheck.org/UploadedFiles/Webby-720-x-307-340x145.png 340w" sizes="auto, (max-width: 640px) 100vw, 640px" />FactCheck.org is a nominee for the 30th Annual Webby Awards in the category for Websites and Mobile Sites: News &#038; Politics. Now our loyal readers can help us win the Webby People’s Voice Award, which is voted on by the public.</p>
<p>The post <a href="https://www.factcheck.org/2026/04/we-could-win-a-webby-with-your-vote/">We Could Win a Webby with Your Vote</a> appeared first on <a href="https://www.factcheck.org">FactCheck.org</a>.</p>
]]></description>
										<content:encoded><![CDATA[<img width="640" height="273" src="https://cdn.factcheck.org/UploadedFiles/Webby-720-x-307.png" class="attachment-medium_large size-medium_large wp-post-image" alt="" style="float:left; margin:0 15px 15px 0;" decoding="async" loading="lazy" srcset="https://cdn.factcheck.org/UploadedFiles/Webby-720-x-307.png 720w, https://cdn.factcheck.org/UploadedFiles/Webby-720-x-307-340x145.png 340w" sizes="auto, (max-width: 640px) 100vw, 640px" />
<p>This is not an April Fools&#8217; Day joke! FactCheck.org is a nominee for the 30th Annual Webby Awards in the category for Websites and Mobile Sites: News &amp; Politics.</p>



<p>Now our loyal readers can help us win the Webby People’s Voice Award, which is voted on by the public. Go to <a href="http://vote.webbyawards.com/" target="_blank" rel="noreferrer noopener">vote.webbyawards.com</a> and sign in or sign up to vote.&nbsp;</p>


<div class="wp-block-image">
<figure class="alignleft size-full"><a href="https://vote.webbyawards.com/PublicVoting#/2026/websites-mobile-sites/general-desktop-mobile-sites/news-politics" target="_blank" rel=" noreferrer noopener"><img loading="lazy" decoding="async" width="245" height="245" src="https://cdn.factcheck.org/UploadedFiles/Webby_PV_2026_voteforus_nominee.webp" alt="" class="wp-image-281542" srcset="https://cdn.factcheck.org/UploadedFiles/Webby_PV_2026_voteforus_nominee.webp 245w, https://cdn.factcheck.org/UploadedFiles/Webby_PV_2026_voteforus_nominee-145x145.webp 145w, https://cdn.factcheck.org/UploadedFiles/Webby_PV_2026_voteforus_nominee-200x200.webp 200w" sizes="auto, (max-width: 245px) 100vw, 245px" /></a></figure></div>


<p><a href="https://vote.webbyawards.com/PublicVoting#/2026/websites-mobile-sites/general-desktop-mobile-sites/news-politics" target="_blank" rel="noreferrer noopener">This link will take you directly to our category</a>. Or, to find us from the main page, click on &#8220;Categories,&#8221; then &#8220;Websites &amp; Mobile Sites,&#8221; then &#8220;General Desktop &amp; Mobile Sites,&#8221; and finally &#8220;News &amp; Politics.&#8221; </p>



<p>Also, if you register with your email address, please be sure to confirm your account so that your vote will count. Click &#8220;Resend Confirmation Email&#8221; if one is not automatically sent to your email address. (If you still don&#8217;t see the email – which should say “Webby People&#8217;s Voice Confirmation” in the subject line – check your spam folder, as the Webby website suggests.)</p>



<p>The voting period ends April 16. The Webby winners, including the ones picked by a panel of expert judges, will be announced April 21. The Webby Awards are presented by the International Academy of Digital Arts and Sciences.</p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<p><em>Editor’s note: FactCheck.org does not accept advertising. We rely on grants and individual donations from people like you. Please consider a donation. Credit card donations may be made through <a href="https://giving.aws.cloud.upenn.edu/?fastStart=simpleForm&amp;program=ANS&amp;fund=602014" target="_blank" rel="noreferrer noopener">our “Donate” page</a>. If you prefer to give by check, send to: FactCheck.org, Annenberg Public Policy Center, P.O. Box 58100, Philadelphia, PA 19102. </em></p>
<p>The post <a href="https://www.factcheck.org/2026/04/we-could-win-a-webby-with-your-vote/">We Could Win a Webby with Your Vote</a> appeared first on <a href="https://www.factcheck.org">FactCheck.org</a>.</p>
]]></content:encoded>
					
		
		
			</item>
		<item>
		<title>Trump Links Biden&#8217;s Ukraine Aid to Pentagon&#8217;s Iran War Funding Request</title>
		<link>https://www.factcheck.org/2026/03/trump-links-bidens-ukraine-aid-to-pentagons-iran-war-funding-request/</link>
		
		<dc:creator><![CDATA[D'Angelo Gore]]></dc:creator>
		<pubDate>Tue, 31 Mar 2026 21:32:02 +0000</pubDate>
				<category><![CDATA[FactCheck Posts]]></category>
		<guid isPermaLink="false">https://www.factcheck.org/?p=281481</guid>

					<description><![CDATA[<p><img width="640" height="273" src="https://cdn.factcheck.org/UploadedFiles/TH-720-x-307.png" class="attachment-medium_large size-medium_large wp-post-image" alt="" style="float:left; margin:0 15px 15px 0;" decoding="async" loading="lazy" srcset="https://cdn.factcheck.org/UploadedFiles/TH-720-x-307.png 720w, https://cdn.factcheck.org/UploadedFiles/TH-720-x-307-340x145.png 340w" sizes="auto, (max-width: 640px) 100vw, 640px" />With the Pentagon potentially seeking a $200 billion supplemental package to fund the ongoing war with Iran, President Donald Trump defended that figure in part by saying U.S. ammunition "was taken down by giving so much to Ukraine." He then exaggerated the amount of aid to Ukraine and falsely said that former President Joe Biden "didn't rebuild anything" in the defense stockpile.</p>
<p>The post <a href="https://www.factcheck.org/2026/03/trump-links-bidens-ukraine-aid-to-pentagons-iran-war-funding-request/">Trump Links Biden&#8217;s Ukraine Aid to Pentagon&#8217;s Iran War Funding Request</a> appeared first on <a href="https://www.factcheck.org">FactCheck.org</a>.</p>
]]></description>
										<content:encoded><![CDATA[<img width="640" height="273" src="https://cdn.factcheck.org/UploadedFiles/TH-720-x-307.png" class="attachment-medium_large size-medium_large wp-post-image" alt="" style="float:left; margin:0 15px 15px 0;" decoding="async" loading="lazy" srcset="https://cdn.factcheck.org/UploadedFiles/TH-720-x-307.png 720w, https://cdn.factcheck.org/UploadedFiles/TH-720-x-307-340x145.png 340w" sizes="auto, (max-width: 640px) 100vw, 640px" />
<p>With the Pentagon potentially seeking a $200 billion supplemental package to fund the ongoing war with Iran, President Donald Trump defended that figure in part by saying U.S. ammunition &#8220;was taken down by giving so much to Ukraine.&#8221; He then exaggerated the amount of aid to Ukraine and falsely said that former President Joe Biden &#8220;didn&#8217;t rebuild anything&#8221; in the defense stockpile.</p>


<div class="wp-block-image">
<figure class="alignleft size-full"><img loading="lazy" decoding="async" width="400" height="267" src="https://cdn.factcheck.org/UploadedFiles/TH-400-x-267.png" alt="" class="wp-image-281503" srcset="https://cdn.factcheck.org/UploadedFiles/TH-400-x-267.png 400w, https://cdn.factcheck.org/UploadedFiles/TH-400-x-267-217x145.png 217w" sizes="auto, (max-width: 400px) 100vw, 400px" /><figcaption class="wp-element-caption">Trump speaks to Hegseth at a roundtable event at the Tennessee Air National Guard Base on March 23. Official White House photo by Molly Riley.</figcaption></figure></div>


<p>Trump has a point that the military assistance provided to Ukraine reduced the U.S. reserve of weapons. But that aid largely has not affected the military operations in Iran, defense experts told us.</p>



<p>Furthermore, Biden signed multiple spending bills passed by Congress that included funding to replace the older weapons that the U.S. gave to Ukraine with new items. Experts also told us that Biden’s administration put money into increasing the production of munitions for the military.</p>



<p>“Of course, the Biden administration built a lot in terms of military equipment,” <a href="https://www.csis.org/people/mark-f-cancian">Mark F. Cancian</a>, senior adviser for the defense and security department at the Center for Strategic and International Studies, told us in an email. “Whether it did enough is another question.”</p>



<p>The subject of the $200 billion request came up during a <a href="https://rollcall.com/factbase/trump/transcript/donald-trump-remarks-bilat-sanae-takaichi-japan-march-19-2026/">March 19 meeting</a> in the Oval Office when a reporter asked Trump why the funding would be necessary if, as Trump had said, the war with Iran would “pretty soon” be over.</p>



<p>“Well, we&#8217;re asking for a lot of reasons beyond even what we&#8217;re talking about in Iran,” the president responded. He went on to add: “We want to have vast amounts of ammunition, which we have right now. We have a lot of ammunition, but it was taken down by giving so much to Ukraine. They gave so much. You know, Biden gave $350 billion worth of cash and military equipment to Ukraine, and he didn&#8217;t rebuild anything.”</p>



<p>Defense Secretary Pete Hegseth also brought up Biden when asked about the potential $200 billion supplemental in a <a href="https://www.war.gov/News/Transcripts/Transcript/Article/4438625/secretary-of-war-pete-hegseth-and-chairman-of-the-joint-chiefs-air-force-gen-da/">press conference</a> that same day.</p>



<p>“As far as $200 billion, I think that number could move,&#8221; Hegseth said. &#8220;It takes money to kill bad guys. So, we&#8217;re going back to Congress and folks there to ensure that we&#8217;re properly funded for what&#8217;s been done, for what we may have to do in the future, ensure that our ammunition is – everything&#8217;s refilled and not just refilled, but above and beyond.”</p>



<p>He went on to say: “And I think, you know, we&#8217;re also still dealing with the environment that Joe Biden created, which was – which was depleting those stock holds and not sending them to our own military, but to Ukraine – which is when, every time we reach back and look at any sort of a challenge we have, it goes back to well, send it to Ukraine.”</p>



<p>But as <a href="https://www.factcheck.org/2025/03/trump-exaggerates-on-u-s-and-european-aid-to-ukraine-loans/">we’ve</a> <a href="https://www.factcheck.org/2025/08/trump-repeats-false-ukraine-aid-claim/">written</a>, the U.S. did not give “$350 billion worth of cash and military equipment to Ukraine.” Trump has made that false claim multiple times.</p>



<p>During the Biden administration, nearly $183 billion – not including a $20 billion loan – was made available for aid to Ukraine, after Russia invaded in February 2022, <a href="https://media.defense.gov/2025/Mar/10/2003663371/-1/-1/1/OAR_Q1_DEC2024_FINAL_508.PDF#page=28&amp;zoom=70,-372,685">according to</a> a report released in <a href="https://www.ukraineoversight.gov/Oversight-Work/Reports-to-Congress/Article-Display/Article/4067887/operation-atlantic-resolve/">February 2025</a> by a special inspector general overseeing U.S. support for Ukraine. The vast majority of that money was authorized by Congress in a series of bipartisan appropriations bills. A portion of the funding was dedicated to military assistance rather than humanitarian or other financial aid.</p>



<p>Biden’s Defense Department said in a <a href="https://media.defense.gov/2025/Jan/09/2003626080/-1/-1/1/UKRAINE-FACT-SHEET-JAN-9-2025.PDF">January 2025 fact sheet</a> that it committed more than $66.5 billion in security assistance to Ukraine, including approximately $65.9 billion following the invasion by Russia in early 2022. Part of that military aid included the transfer of a variety of missiles, artillery, tanks and other armaments from the Defense Department.&nbsp;</p>



<p>Defense experts told us that aid has temporarily reduced the U.S. reserve of available weapons.</p>



<p>“It is true that U.S. stockpiles are badly depleted by aid to Ukraine,” <a href="https://www.defensepriorities.org/people/jennifer-kavanagh/">Jennifer Kavanagh</a>, a senior fellow and director of military analysis at <a href="https://www.defensepriorities.org/about/mission-and-vision/">Defense Priorities</a>, a think tank that advocates a “restrained foreign policy,” told us in an email. “This long-term problem will take time to address. It is not something that has been resolved and is ongoing across many types of munitions and air defense.”</p>



<p>However, she said it would be “misleading” to suggest that military aid to Ukraine is responsible for most of the “current munitions concerns” in Iran because of the type of weapons that have been used in the war to date.</p>



<p>“With the exception of Patriot interceptors, most [of] the munitions in use in the Middle East were not given to Ukraine at any point,” Kavanagh said, referring to the <a href="https://www.congress.gov/crs-product/IF12297">PATRIOT air defense systems</a> that can shoot down incoming ballistic missiles.</p>



<p>For example, the Washington Post <a href="https://www.washingtonpost.com/national-security/2026/03/27/iran-war-tomahawk-missiles/" target="_blank" rel="noreferrer noopener">reported</a>, citing anonymous sources, that the U.S. used more than 850 Tomahawk cruise missiles against Iran in a month, raising concerns among some Pentagon officials about the limited supply. But the U.S. <a href="https://www.armscontrol.org/act/2025-11/news/trump-rejects-tomahawk-missile-sale-ukraine" target="_blank" rel="noreferrer noopener">has not given</a> Tomahawks to Ukraine, even though Ukrainian President Volodymyr Zelenskyy has requested them.</p>



<p>Cancian, at the Center for Strategic and International Studies, also told us in an email that besides “Patriot batteries and missiles,” which Ukraine has used “extensively” against Russia, the munitions the U.S. gave to Ukraine “were almost entirely for ground forces, which is not an issue in the current war.”</p>



<p>So far, U.S. ground troops have not been ordered into combat. The U.S. and Israel have conducted joint airstrikes since <a href="https://www.cfr.org/global-conflict-tracker/conflict/confrontation-between-united-states-and-iran">launching the attack</a> on Iran on Feb. 28. But thousands of American soldiers were <a href="https://www.reuters.com/world/middle-east/thousands-us-army-paratroopers-arrive-middle-east-buildup-intensifies-2026-03-30/" target="_blank" rel="noreferrer noopener">recently deployed</a> to the Middle East in case Trump does authorize ground operations.</p>



<p>“So, it is fair to link Ukraine aid to shortages in U.S. Patriot missile stockpiles, but not limited magazine depth more broadly,” Kavanagh said. “That larger problem stems from years of low production and constraints on the U.S. defense industrial base.”</p>



<p>Cancian said that CSIS has estimated that the inventory of Patriot missiles will last through the war with Iran, but “will be well below what war planners want for a possible conflict in the western Pacific.” Exact figures <a href="https://www.newsweek.com/us-weapons-stockpile-examined-amid-potential-war-with-iran-11369229" target="_blank" rel="noreferrer noopener">are not available</a> because inventory totals are classified.</p>



<p>Meanwhile, both defense experts told us that Trump was wrong to claim that Biden did nothing as president to try to “rebuild” the stockpile.</p>



<p>“The Biden administration invested heavily in the U.S. defense industrial base and began a massive ramp-up in the production of many types of munitions that Trump continues,” Kavanagh said. “Much of the funding in the defense supplemental appropriations went to this purpose and the Pentagon made a real effort to expand munitions production and stockpiles. Some would say that Biden did not do enough or acted too slowly, but these are judgment calls. It is not accurate to say he built nothing.”</p>



<p>Cancian said that Biden &#8220;began the process of expanding munitions production by investing money in facilities and signing multiyear contracts.&#8221; He also noted that Congress, under Biden, appropriated money to replace all the military equipment that the U.S. sent to Ukraine. </p>



<p>Biden made that point himself in an <a href="https://youtu.be/wTxDZ6D1A1E?si=Qp8y8EgojmVWpTXU&amp;t=730">October 2023 address</a> to the American public.</p>



<p>“Let me be clear about something,” the former president said. “We send Ukraine equipment sitting in our stockpiles. And when we use the money allocated by Congress, we use it to replenish our own stores, our own stockpiles, with new equipment. Equipment that defends America and is made in America.”</p>



<p>The issue, Cancian said, is that “it will take years before all of the replacement equipment arrives.” He said, “That gap constitutes risk if other conflicts break out.”</p>



<p>On Jan. 20, 2025, the day that Biden left office, the State Department <a href="https://www.state.gov/bureau-of-political-military-affairs/use-of-presidential-drawdown-authority-for-military-assistance-for-ukraine">said</a> that Presidential Drawdown Authority had been used 55 times since August 2021 to provide military assistance to Ukraine “totaling approximately $31.7 billion from DoD stockpiles.” The <a href="https://media.defense.gov/2025/Mar/10/2003663371/-1/-1/1/OAR_Q1_DEC2024_FINAL_508.PDF#page=28&amp;zoom=70,-372,618">February 2025 report</a> from the Ukraine oversight inspector general said that Congress appropriated $45.8 billion to replace the materials the Defense Department donated to Ukraine.</p>



<p>Notably, when we asked about the $200 billion Pentagon request and Trump&#8217;s and Hegseth’s claims about Biden draining the U.S. stockpile, White House Press Secretary Karoline Leavitt said that the U.S. has all that it needs for operations in Iran.</p>



<p>&#8220;The US military has more than enough munitions, ammo, and weapons stockpiles to achieve the goals of Operation Epic Fury laid out by President Trump — and beyond,&#8221; she said in an emailed statement.</p>



<p>“Nevertheless,” she went on, “President Trump has always been intensely focused on strengthen[ing] our Armed Forces and he will continue to call on defense contractors to more speedily build American-made weapons, which are the best in the world.&#8221;</p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<p><em>Editor’s note: FactCheck.org does not accept advertising. We rely on grants and individual donations from people like you. Please consider a donation. Credit card donations may be made through <a href="https://giving.aws.cloud.upenn.edu/?fastStart=simpleForm&amp;program=ANS&amp;fund=602014" target="_blank" rel="noreferrer noopener">our “Donate” page</a>. If you prefer to give by check, send to: FactCheck.org, Annenberg Public Policy Center, P.O. Box 58100, Philadelphia, PA 19102. </em></p>
<p>The post <a href="https://www.factcheck.org/2026/03/trump-links-bidens-ukraine-aid-to-pentagons-iran-war-funding-request/">Trump Links Biden&#8217;s Ukraine Aid to Pentagon&#8217;s Iran War Funding Request</a> appeared first on <a href="https://www.factcheck.org">FactCheck.org</a>.</p>
]]></content:encoded>
					
		
		
			</item>
		<item>
		<title>Flaws in Government Tool to ID Noncitizen Voters</title>
		<link>https://www.factcheck.org/2026/03/flaws-in-government-tool-to-id-noncitizen-voters/</link>
		
		<dc:creator><![CDATA[Robert Farley]]></dc:creator>
		<pubDate>Mon, 30 Mar 2026 21:11:36 +0000</pubDate>
				<category><![CDATA[FactCheck Posts]]></category>
		<category><![CDATA[Featured Posts]]></category>
		<guid isPermaLink="false">https://www.factcheck.org/?p=281395</guid>

					<description><![CDATA[<p><img width="640" height="273" src="https://cdn.factcheck.org/UploadedFiles/VoterRegistration1.png" class="attachment-medium_large size-medium_large wp-post-image" alt="" style="float:left; margin:0 15px 15px 0;" decoding="async" loading="lazy" srcset="https://cdn.factcheck.org/UploadedFiles/VoterRegistration1.png 720w, https://cdn.factcheck.org/UploadedFiles/VoterRegistration1-340x145.png 340w" sizes="auto, (max-width: 640px) 100vw, 640px" />Republican Sen. Mike Lee said that he believes there are "at least tens of thousands, probably hundreds of thousands" of noncitizens illegally registered to vote in the U.S., adding that a federal tool used in nearly two dozen states would help identify the number. But the tool has wrongly flagged many as being noncitizens, and there's no evidence of widespread noncitizen voting. </p>
<p>The post <a href="https://www.factcheck.org/2026/03/flaws-in-government-tool-to-id-noncitizen-voters/">Flaws in Government Tool to ID Noncitizen Voters</a> appeared first on <a href="https://www.factcheck.org">FactCheck.org</a>.</p>
]]></description>
										<content:encoded><![CDATA[<img width="640" height="273" src="https://cdn.factcheck.org/UploadedFiles/VoterRegistration1.png" class="attachment-medium_large size-medium_large wp-post-image" alt="" style="float:left; margin:0 15px 15px 0;" decoding="async" loading="lazy" srcset="https://cdn.factcheck.org/UploadedFiles/VoterRegistration1.png 720w, https://cdn.factcheck.org/UploadedFiles/VoterRegistration1-340x145.png 340w" sizes="auto, (max-width: 640px) 100vw, 640px" />
<p>Republican Sen. Mike Lee said that he believes there are &#8220;at least tens of thousands, probably hundreds of thousands&#8221; of noncitizens illegally registered to vote in the U.S., adding that a federal tool used in nearly two dozen states would help identify the number. But the tool has wrongly flagged many as being noncitizens, and there&#8217;s no evidence of widespread noncitizen voting. </p>



<p>The data-matching program employed in those states over the last year identified about 10,000 potential noncitizens on voter registration lists, out of about 49 million voter registrations checked, according to reporting by the New York Times citing federal officials. But upon further investigation, county officials found U.S. citizens were among those identified.</p>



<p>In addition, election officials determined some noncitizens were inadvertently added by county officials to voter lists, and still others were noncitizens who mistakenly checked a box for voter registration even after acknowledging on the same forms that they were noncitizens.</p>



<p>Experts and state audits refute the idea of widespread noncitizen voting. </p>



<p>The SAVE America Act championed by Lee &#8212; and touted by President Donald Trump as necessary to stop illegal voting by noncitizens &#8212; would require all states to submit their voter registration lists to the Department of Homeland Security to be run through this tool, called the Systematic Alien Verification for Entitlements, or SAVE, program. The bill passed the House and is <a href="https://www.factcheck.org/2026/03/qa-on-the-save-america-act/" target="_blank" rel="noreferrer noopener">being debated</a> in the Senate. Lee <a href="https://www.youtube.com/watch?v=3qjXmQIePP4&amp;t=254s" target="_blank" rel="noreferrer noopener">made his comments</a> about noncitizens being registered to vote in a March 22 interview on Fox News&#8217; &#8220;Sunday Morning Futures.&#8221;</p>



<p><a href="https://www.brennancenter.org/experts/jasleen-singh" target="_blank" rel="noreferrer noopener">Jasleen Singh</a>, a senior counsel and manager in the Brennan Center for Justice&#8217;s democracy program, said that Lee&#8217;s speculation about the number of noncitizens on voter registration lists amounts to &#8220;another outlandish claim without evidence.&#8221; The reality, Singh said, is that &#8220;noncitizen voting is vanishingly rare.&#8221;</p>



<p>The SAVE program, Singh said, &#8220;is one of many tools that election officials have in their toolbox to use. It comes with a myriad of data flaws, and any results that come directly from a search to the SAVE program need to be viewed with that lens and with a good degree of skepticism.&#8221;</p>



<p>Acting upon an <a href="https://www.whitehouse.gov/presidential-actions/2025/03/preserving-and-protecting-the-integrity-of-american-elections/" target="_blank" rel="noreferrer noopener">executive order</a> from Trump in March 2025, DHS <a href="https://www.hsgac.senate.gov/wp-content/uploads/Testimony-Edlow-2025-02-12.pdf" target="_blank" rel="noreferrer noopener">overhauled</a> the SAVE program last spring to include Social Security data. Trump also waived fees to states to access the database, allowing bulk searches.</p>



<p>“What we do know is that in states that have started reviewing the voter registration files in order to weed out those [ineligible people] who might have registered, perhaps inadvertently … already there have been thousands of voter registration files identified in just the handful of states doing their own reviews,” Lee <a href="https://thehill.com/homenews/senate/5792776-save-america-act-election-impact/" target="_blank" rel="noreferrer noopener">told</a> the Hill on March 20.</p>



<p>We reached out to Lee&#8217;s office but did not get a response.</p>



<p>Many states &#8212; predominantly ones run by Democrats &#8212; have refused to share their voting lists with the SAVE program. U.S. Attorney General Pam Bondi has <a href="https://www.justice.gov/opa/pr/justice-department-sues-five-additional-states-failure-produce-voter-rolls" target="_blank" rel="noreferrer noopener">sued</a> 29 states and the District of Columbia for failing to provide the federal government with their lists.</p>



<p>But nearly two dozen states have utilized the SAVE program. Lee is correct that &#8220;thousands&#8221; of people have been flagged as potentially being noncitizens.&nbsp;As we said,&nbsp;of the 49.5 million voter registrations checked, DHS referred about 10,000 cases to investigators, according to a <a href="https://www.nytimes.com/2026/01/14/us/politics/noncitizen-voters-save-tool.html" target="_blank" rel="noreferrer noopener">Jan. 14 New York Times report</a>&nbsp;that attributed the figures to a spokesman for U.S. Citizenship and Immigration Services. (There were 174 million people registered to vote in the U.S. for the 2024 election, according to the <a href="https://www.census.gov/newsroom/press-releases/2025/2024-presidential-election-voting-registration-tables.html" target="_blank" rel="noreferrer noopener">U.S. Census</a>. In other words, less than a third of all names on state voter registration lists nationwide have been run through the SAVE program.)</p>



<p>But the Times reported that local election officials began to discover that some of the names flagged by the SAVE program turned out to be citizens. That appeared to be particularly true for recently naturalized citizens. Tens of thousands of people are naturalized as citizens every month, according to U.S. Citizenship and Immigration Services <a href="https://www.uscis.gov/citizenship-resource-center/naturalization-statistics" target="_blank" rel="noreferrer noopener">data</a>.</p>


<div class="wp-block-image">
<figure class="alignleft size-full"><img loading="lazy" decoding="async" width="400" height="279" src="https://cdn.factcheck.org/UploadedFiles/VoterRegistration2.png" alt="" class="wp-image-281462" srcset="https://cdn.factcheck.org/UploadedFiles/VoterRegistration2.png 400w, https://cdn.factcheck.org/UploadedFiles/VoterRegistration2-208x145.png 208w" sizes="auto, (max-width: 400px) 100vw, 400px" /><figcaption class="wp-element-caption">A stack of voter registration forms in the Loving County offices in Mentone, Texas, on Aug. 19, 2025. Photo by Elizabeth Conley/Houston Chronicle via Getty Images.</figcaption></figure></div>


<p>A <a href="https://www.texastribune.org/2026/02/13/save-voter-citizenship-tool-mistakes-confusion/" target="_blank" rel="noreferrer noopener">joint investigation</a> by ProPublica and the Texas Tribune found that in addition to many citizens being wrongly flagged as noncitizens, several election officials &#8220;came across instances in which voters marked on registration forms that they weren’t citizens, but were registered by election office staffers in error. Clerks also said voters have told them they’d misunderstood questions about eligibility when getting drivers’ licenses.&#8221;</p>



<p>Ongoing <a href="https://electioninnovation.org/research/noncitizen-analysis-update/" target="_blank" rel="noreferrer noopener">research </a>by the Center for Election Innovation &amp; Research &#8220;continues to find that sweeping allegations about noncitizen registrations or voting appear to arise from misunderstandings, mischaracterizations, or outright fabrications about complex voter data. In every examined case, when claims about large numbers of noncitizens on voting rolls are subject to scrutiny and properly investigated, the number of alleged instances falls drastically.&#8221;</p>



<p>Even in the states that have used the federal SAVE program, &#8220;Claims of large numbers of possible noncitizens on voter records are revised significantly downward after proper investigation and scrutiny. Most often, investigations into large claims reveal that at least some early flags were based on outdated, incomplete, or improperly matched data that incorrectly labeled eligible citizens as possible noncitizens,&#8221; CEIR reported in February. Those smaller, revised numbers &#8220;generally receive far less public attention.&#8221;</p>



<h2 class="wp-block-heading has-text-align-center">Lee&#8217;s Home State of Utah</h2>



<p>Interestingly, the SAVE America Act faces significant opposition from the top Republican election official in Lee&#8217;s home state of Utah, which last year <a href="https://drive.google.com/file/d/102Ecq5lgqBzch6CNe-kkqrPt_BxZ7s8V/view" target="_blank" rel="noreferrer noopener">initiated</a> a citizenship review of all registered voters in the state. Ultimately, officials announced in January that they were only able to confirm the state voter rolls included one noncitizen, and that person did not vote.</p>



<p>State officials first compared voter records against driver&#8217;s license data, which records citizenship status. The conclusion: 99.9% of the state&#8217;s 2 million voters were citizens. But that left the status of 71,314 people unclear, so officials checked those against the SAVE database, which <a href="https://utahnewsdispatch.com/2026/01/23/utah-early-findings-from-voter-citizenship-review/" target="_blank" rel="noreferrer noopener">narrowed</a> the potential number of noncitizens to 8,836. Staff in the state elections office then reviewed the remaining voters’ information. That narrowed the list to 486 they could not immediately verify were citizens. Officials sent letters to everyone in that group and got back 52 responses, including many from older voters who registered before the state required a driver&#8217;s license or Social Security number.</p>



<p>“The bottom line is, there is not a widespread problem,” Lt. Gov. Deidre Henderson, a Republican, <a href="https://utahnewsdispatch.com/2026/01/23/utah-early-findings-from-voter-citizenship-review/" target="_blank" rel="noreferrer noopener">said</a> at the time. “You hear people say hundreds or thousands — it’s just not.”</p>



<p>Henderson, who oversees elections in the state, wrote in a January <a href="https://drive.google.com/file/d/102Ecq5lgqBzch6CNe-kkqrPt_BxZ7s8V/view" target="_blank" rel="noreferrer noopener">press release</a> that through Utah&#8217;s citizenship review, &#8220;We also learned that the federal government does not keep accurate databases.&#8221;</p>



<p>The SAVE program, she said, &#8220;is notoriously inaccurate and frequently flags individuals who are, in fact, citizens.&#8221;</p>



<p>Henderson and others have also raised concerns about the SAVE America Act requiring states to use the DHS database immediately, in the midst of a midterm election year.</p>



<p>“If we want a federal law mandating voter ID or DPOC [documentary proof of citizenship], and it’s really not about disenfranchising a bunch of voters, then states and voters need an onramp with time to prepare — get the documents, obtain the right ID, set up the system,” Henderson <a href="https://utahnewsdispatch.com/2026/03/19/utah-lieutenant-governor-says-save-act-would-hurt-utah-voters-mike-lee/" target="_blank" rel="noreferrer noopener">wrote</a> in a social media <a href="https://www.threads.com/@deidrehenderson/post/DWAic4njN_i?xmt=AQF0cGolFunMXQZXtbVqRpzJdCXl8MTcXZ2cg4xsv3MF_g" target="_blank" rel="noreferrer noopener">post</a> on March 17. “That’s not what’s happening with the SAVE America Act. This bill would be effective immediately in the middle of an election year.”</p>



<h2 class="wp-block-heading has-text-align-center">SAVE Flaws Found in Other States</h2>



<p>Similar stories have played out in other states that used the SAVE program.</p>



<p>One of the first states to implement the SAVE program was Texas, and on Oct. 22, Texas&#8217; secretary of state, Jane Nelson, <a href="https://www.sos.state.tx.us/about/newsreleases/2025/102025.shtml" target="_blank" rel="noreferrer noopener">announced</a> that it had completed a full comparison of the state’s voter registration list against citizenship data in the SAVE database. Calling it a &#8220;game changer,&#8221; Nelson said the SAVE program identified 2,724 potential noncitizens on the state&#8217;s voter registration rolls &#8212; or less than 0.02% of more than 18 million voters.</p>



<p>Nelson said the list of those potential noncitizens was sent to Texas counties to conduct investigations, with the understanding that those deemed to be noncitizens would be purged from voter registration lists and those who were found to have voted illegally would be referred to the Texas attorney general for prosecution.</p>



<p>“Everyone’s right to vote is sacred and must be protected. We encourage counties to conduct rigorous investigations to determine if any voter is ineligible — just as they do with any other data set we provide,” Nelson said.</p>



<p>But that&#8217;s where things began to fall apart. </p>



<p>As a <a href="https://www.texastribune.org/2026/02/13/save-voter-citizenship-tool-mistakes-confusion/" target="_blank" rel="noreferrer noopener">joint investigation</a> by ProPublica and the Texas Tribune documented, lacking clear guidance, some counties investigated; others didn&#8217;t. Some sent letters to people on the list and purged those who failed to respond; others didn&#8217;t purge any names.</p>



<p>Some counties compared the names on their list to databases kept by the Department of Public Safety, which requires proof of citizenship if residents register to vote when obtaining a driver’s license. Those checks found many of those on the list identified as potentially noncitizens were citizens.</p>



<p>In Potter County, for example, three of nine voters on the list had proof of citizenship on file, the ProPublica/Texas Tribune investigation found. In Travis County, it was 11 of the 97 voters flagged by the SAVE program. Overall, the counties that checked the SAVE-generated list against DPS records found &#8220;more than 5% of the voters SAVE identified as noncitizens proved to be citizens,&#8221; the investigation concluded.</p>



<p>“It has proven to be inaccurate,” Travis County&#8217;s voter registrar, Celia Israel, told the publications. “Why would I rely on it?”</p>



<p>While the SAVE program accurately identified many on the voter registration rolls who were ineligible to vote, &#8220;Several [counties] came across instances in which voters marked on registration forms that they weren’t citizens, but were registered by election office staffers in error. Clerks also said voters have told them they’d misunderstood questions about eligibility when getting drivers’ licenses,&#8221; the ProPublica/Texas Tribune report said.</p>



<p>In Louisiana, the SAVE program <a href="https://www.shreveporttimes.com/story/news/2026/03/18/louisiana-voter-rolls-cleaned-as-verification-debate-heats-up-in-d-c/89208562007/" target="_blank" rel="noreferrer noopener">identified</a> 403 potential noncitizens registered to vote, out of 2.96 million registered voters. That&#8217;s about 0.014%. Of those potential noncitizens, 83 cast at least one vote going back to the 1980s (though it was not clear how many of those were later verified to be noncitizens). In 2024, 2,006,975 people <a href="https://www.presidency.ucsb.edu/statistics/elections/2024" target="_blank" rel="noreferrer noopener">voted</a> in the presidential election in Louisiana. Even if all 83 of them voted that year, that would translate to about 0.004% of all votes cast in the state.</p>



<p>“I want to be clear: noncitizens illegally registering or voting is not a systemic problem in Louisiana,&#8221; Louisiana Secretary of State Nancy Landry <a href="https://www.facebook.com/Louisianasos/posts/secretary-of-state-nancy-landry-announced-the-preliminary-results-of-an-ongoing-/1271219118366334/" target="_blank" rel="noreferrer noopener">said</a> when the preliminary results were revealed last September.</p>



<p>Missouri also employed the SAVE program and generated lists of potential noncitizens, which it then circulated to local officials.</p>



<p>On Dec. 3, more than 70 county election clerks from both parties wrote <a href="https://www.documentcloud.org/documents/26496308-missouri-clerk-letter-to-legislature/" target="_blank" rel="noreferrer noopener">a letter</a> to the state&#8217;s speaker of the House warning, &#8220;These lists are deeply flawed: they are outdated, inaccurate, and include individuals we know to be U.S. citizens—our neighbors, colleagues, and even voters we have personally registered at naturalization ceremonies.&#8221;</p>



<p>It&#8217;s not clear how many noncitizens flagged by the SAVE database actually voted. But there have been relatively few arrests nationwide for illegal voting by noncitizens.</p>



<p>That makes sense, Singh told us, considering the stiff consequences for convictions for voting illegally as a noncitizen. Current&nbsp;<a href="https://www.congress.gov/bill/103rd-congress/house-bill/2/text" target="_blank" rel="noreferrer noopener">federal law</a>&nbsp;requires those registering to vote to attest that they are citizens under penalty of perjury.&nbsp;Noncitizens convicted of voting in federal elections face fines, jail time and deportation.</p>



<p>&#8220;Someone who is in this country, who may not have documents, or who has a legal presence and is not a citizen yet, whatever it is, they&#8217;re not going to risk their ability to be in this country to cast a ballot, because they will be subject to deportation,&#8221; Singh said. &#8220;And it&#8217;s just not a risk that folks are, if we think about it logically and reasonably, that folks are going to be willing to take.&#8221;</p>



<p>According to the conservative Heritage Foundation&#8217;s <a href="https://electionfraud.heritage.org/search" target="_blank" rel="noreferrer noopener">election fraud database</a>, just under 100 noncitizens have been convicted of illegally voting or registering to vote since 1982.</p>



<p>There may be so few prosecutions, Singh said, because by and large, when noncitizens are on registration rolls &#8220;it&#8217;s likely a mistake or because of an error by the person registering, or maybe the DMV &#8230; whatever it is, it&#8217;s a mistake rather than an actual intentional act.&#8221;</p>



<p>“The evidence is that the number of noncitizens illegally voting in federal elections is extremely low, not high enough to have changed the party outcome of any federal election in recent years,” Walter Olson, a senior fellow at the libertarian Cato Institute, <a href="https://www.factcheck.org/2025/04/musks-unsupported-claim-to-have-unveiled-massive-illegal-voting-by-noncitizens/" target="_blank" rel="noreferrer noopener">told us</a> last April. “Audits and investigations in states like Ohio, Nevada, and North Carolina have found the numbers to be tiny in relation to votes cast. … The consistent experience has been that very few persons in this category mistakenly or deliberately vote.”</p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<p><em>Editor’s note:&nbsp;FactCheck.org does not accept advertising. We rely on grants and individual donations from people like you. Please consider a donation. Credit card donations may be made through&nbsp;<a href="https://giving.aws.cloud.upenn.edu/?fastStart=simpleForm&amp;program=ANS&amp;fund=602014" target="_blank" rel="noreferrer noopener">our “Donate” page</a>. If you prefer to give by check, send to: FactCheck.org, Annenberg Public Policy Center, P.O. Box 58100, Philadelphia, PA 19102.&nbsp;</em></p>
<p>The post <a href="https://www.factcheck.org/2026/03/flaws-in-government-tool-to-id-noncitizen-voters/">Flaws in Government Tool to ID Noncitizen Voters</a> appeared first on <a href="https://www.factcheck.org">FactCheck.org</a>.</p>
]]></content:encoded>
					
		
		
			</item>
		<item>
		<title>Competing Claims on SAVE America Act Disenfranchising Voters</title>
		<link>https://www.factcheck.org/2026/03/competing-claims-on-save-america-act-disenfranchising-voters/</link>
		
		<dc:creator><![CDATA[Lori Robertson]]></dc:creator>
		<pubDate>Tue, 24 Mar 2026 22:02:32 +0000</pubDate>
				<category><![CDATA[FactCheck Posts]]></category>
		<guid isPermaLink="false">https://www.factcheck.org/?p=281375</guid>

					<description><![CDATA[<p><img width="640" height="273" src="https://cdn.factcheck.org/UploadedFiles/Schumer-720-x-307.png" class="attachment-medium_large size-medium_large wp-post-image" alt="" style="float:left; margin:0 15px 15px 0;" decoding="async" loading="lazy" srcset="https://cdn.factcheck.org/UploadedFiles/Schumer-720-x-307.png 720w, https://cdn.factcheck.org/UploadedFiles/Schumer-720-x-307-340x145.png 340w" sizes="auto, (max-width: 640px) 100vw, 640px" />Senate Minority Leader Chuck Schumer has said the SAVE America Act "could disenfranchise over 20 million American citizens," while Republicans dispute that the voter registration and ID bill would block any legitimate voters. Election experts say the bill, which isn't expected to pass, would make it difficult for some unknown number of voters to register and cast a vote.</p>
<p>The post <a href="https://www.factcheck.org/2026/03/competing-claims-on-save-america-act-disenfranchising-voters/">Competing Claims on SAVE America Act Disenfranchising Voters</a> appeared first on <a href="https://www.factcheck.org">FactCheck.org</a>.</p>
]]></description>
										<content:encoded><![CDATA[<img width="640" height="273" src="https://cdn.factcheck.org/UploadedFiles/Schumer-720-x-307.png" class="attachment-medium_large size-medium_large wp-post-image" alt="" style="float:left; margin:0 15px 15px 0;" decoding="async" loading="lazy" srcset="https://cdn.factcheck.org/UploadedFiles/Schumer-720-x-307.png 720w, https://cdn.factcheck.org/UploadedFiles/Schumer-720-x-307-340x145.png 340w" sizes="auto, (max-width: 640px) 100vw, 640px" />
<p>Senate Minority Leader Chuck Schumer has said the SAVE America Act &#8220;could disenfranchise over 20 million American citizens,&#8221; while Republicans dispute that the voter registration and ID bill would block any legitimate voters. Election experts say the bill, which isn&#8217;t expected to pass, would make it difficult for some unknown number of voters to register and cast a vote.</p>



<p>At times, Schumer has used more definitive language about the bill&#8217;s impact, <a href="https://www.democrats.senate.gov/newsroom/press-releases/transcript-leader-schumer-joins-jake-tapper-on-cnns-state-of-the-union-to-discuss-negotiations-to-rein-in-ice" target="_blank" rel="noreferrer noopener">saying</a> that &#8220;more than 20 million legitimate people &#8230; will not be able to vote under this law&#8221; or <a href="https://www.facebook.com/senschumer/posts/the-save-act-is-jim-crow-20-it-would-disenfranchise-tens-of-millions-of-people-i/1505882047563060/" target="_blank" rel="noreferrer noopener">that</a> it &#8220;would disenfranchise tens of millions of people.&#8221;</p>


<div class="wp-block-image">
<figure class="alignleft size-full"><img loading="lazy" decoding="async" width="400" height="267" src="https://cdn.factcheck.org/UploadedFiles/Schumer-400-x-267.png" alt="" class="wp-image-281409" srcset="https://cdn.factcheck.org/UploadedFiles/Schumer-400-x-267.png 400w, https://cdn.factcheck.org/UploadedFiles/Schumer-400-x-267-217x145.png 217w" sizes="auto, (max-width: 400px) 100vw, 400px" /><figcaption class="wp-element-caption">Schumer speaks during a rally against the SAVE America Act outside the U.S. Capitol on March 18. Photo by Nathan Posner/Anadolu via Getty Images.</figcaption></figure></div>


<p><a href="https://www.cato.org/people/walter-olson" target="_blank" rel="noreferrer noopener">Walter Olson</a>, a senior fellow at the Cato Institute’s Robert A. Levy Center for Constitutional Studies, told us the legislation wouldn&#8217;t meet the dictionary definition of &#8220;disenfranchise,&#8221; which is to &#8220;deprive a person of the right to vote.&#8221; But it would, as <a href="https://www.murray.senate.gov/senator-murray-sounds-alarm-on-trump-and-republicans-efforts-to-make-it-harder-and-more-expensive-to-vote/" target="_blank" rel="noreferrer noopener">described</a> by Democratic Sen. Patty Murray, &#8220;&#8216;make it harder and more expensive for [many people] to [register and] vote,'&#8221; Olson said in an email. &#8220;That extra hassle and expense would mean that some citizens eligible to register and vote will in practice not complete the needed process even though the bill does not take away their legal right to register or to vote.</p>



<p>&#8220;How many eligible people will fail to complete the process? Any estimate is guesswork at this stage in part because it depends on factors that the bill itself leaves unspecified,&#8221; he said.</p>



<p>Schumer&#8217;s 20 million figure comes from an estimate of the number of voting age Americans who don&#8217;t have easy access to citizenship documents that the bill would require to register to vote. According to&nbsp;<a href="https://www.brennancenter.org/our-work/analysis-opinion/millions-americans-dont-have-documents-proving-their-citizenship-readily" target="_blank" rel="noreferrer noopener">a 2023 survey</a>&nbsp;by New York University’s Brennan Center for Justice and other groups, more than 9% of Americans of voting age, or 21.3 million people, wouldn’t be able to “quickly find” documents such as a passport, birth certificate or naturalization papers if they “had to show it tomorrow.” More than 3.8 million of those people don&#8217;t have those documents, the survey <a href="https://cdce.umd.edu/sites/cdce.umd.edu/files/pubs/Voter%20ID%20survey%20Key%20Results%20June%202024.pdf" target="_blank" rel="noreferrer noopener">found</a>.</p>



<p>That doesn&#8217;t mean that at least some of those Americans couldn&#8217;t obtain or find proof of citizenship in order to register to vote under the legislation. But some could find the process too onerous to complete, experts say. Under the bill, citizenship documents also would need to be presented in person to an election official if registering to vote for the first time or reregistering after moving, changing one&#8217;s name or making other changes to voter registration.</p>



<p><a href="https://www.brennancenter.org/experts/eliza-sweren-becker" target="_blank" rel="noreferrer noopener">Eliza Sweren-Becker</a>, deputy director of the voting rights and elections program at the Brennan Center for Justice, told us that &#8220;it&#8217;s definitely safe to say that millions of Americans would be blocked from voting&#8221; by the bill&#8217;s registration requirements, among other provisions. She noted that tens of millions of Americans register or update their registrations in the two years before elections. More than <a href="https://www.eac.gov/sites/default/files/2025-07/2024_EAVS_Report_508.pdf" target="_blank" rel="noreferrer noopener">103 million</a> did so in the two years before the 2024 election, according to survey reports by the U.S. Election Assistance Commission.</p>



<p>&#8220;As many as 21 million could be stopped from voting&#8221; under the SAVE America Act, she said, because they lack ready access to a passport, birth certificate or naturalization document required under the bill for voter registration. </p>



<p>Schumer has repeatedly used the 20 million estimate, adding that these voters could be purged from the voter rolls and not know about it until they showed up to vote, at times linking this to a requirement under the bill for states to use a Department of Homeland Security database to remove noncitizens. &#8220;Our objection is it&#8217;s a voter suppression bill. Twenty million, maybe more people, when they show up to vote &#8230; will be told, you&#8217;re off the rolls. That&#8217;s the problem with the bill,&#8221; Schumer <a href="https://www.c-span.org/clip/news-conference/user-clip-schumer-on-save-america-act/5197632" target="_blank" rel="noreferrer noopener">said</a> in a March 17 press conference.</p>



<p>On the Senate floor the same day, the Democratic leader <a href="https://www.democrats.senate.gov/news/press-releases/leader-schumer-floor-remarks-on-democrats-plan-to-block-republicans-voter-suppression-bill-the-save-act" target="_blank" rel="noreferrer noopener">said</a>, &#8220;It could purge millions of American citizens from the voter rolls through a screening algorithm designed by Elon Musk’s DOGE squad. It could disenfranchise over 20 million American citizens.&#8221;</p>



<p>The DHS database <a href="https://www.factcheck.org/2026/03/qa-on-the-save-america-act/" target="_blank" rel="noreferrer noopener">is known</a> to have wrongly flagged as noncitizens some Americans who are, in fact, citizens. But the extent of those flaws is unclear &#8212; as is how voters might be notified and purged from voter rolls under the legislation.</p>



<p>Republican Sen. John Cornyn objected to Schumer&#8217;s remarks. On the Senate floor on March 19, Cornyn <a href="https://www.congress.gov/119/crec/2026/03/19/172/50/CREC-2026-03-19-pt1-PgS1314.pdf" target="_blank" rel="noreferrer noopener">said</a> that Schumer&#8217;s &#8220;general argument that American citizens would be denied the opportunity to vote is patently false. Thirty-eight states, including states like Georgia and Rhode Island, currently represented by Democrats, require voter ID. Are those states suppressing the vote? Is the minority leader suggesting that 38 out of our 50 states are actively engaged in voter suppression? Well, that is preposterous on its face.&#8221;</p>



<p>&#8220;So the idea that the SAVE America Act will disenfranchise legitimate voters is a bald-faced—well, let me try to be generous. It is not true, and he knows it,&#8221; Cornyn said, adding that Schumer was telling &#8220;people who may not be informed about the details of this that we are trying to take away their right to vote.”</p>



<p>Cornyn is nearly correct on the number: 36 states have some form of voter ID laws. But the requirements in the bill before the Senate are &#8220;stricter&#8221; than most of those state laws, <a href="https://www.ncsl.org/state-legislatures-news/details/9-things-to-know-about-the-proposed-save-america-act" target="_blank" rel="noreferrer noopener">according to the National Conference of State Legislatures</a>. </p>



<p>We&#8217;ll explain what the bill would require for registering and casting votes, and how this could affect voters. (For more, see our article &#8220;<a href="https://www.factcheck.org/2026/03/qa-on-the-save-america-act/" target="_blank" rel="noreferrer noopener">Q&amp;A on the SAVE America Act</a>.&#8221;)</p>



<p>The <a href="https://www.congress.gov/bill/119th-congress/senate-bill/1383/text" target="_blank" rel="noreferrer noopener">SAVE America Act</a> passed the House in February, and the Senate began debate on the bill on March 17. Similar legislation in recent years has failed to pass the Senate. A proposed <a href="https://www.congress.gov/amendment/119th-congress/senate-amendment/4420/text" target="_blank" rel="noreferrer noopener">Senate amendment</a> would impose more restrictions on voting by mail, eliminating universal mail-in voting and only allowing mail ballots in certain cases, such as illness or disability, travel, or military service. Here, we describe the bill as it passed the House.</p>



<h2 class="wp-block-heading has-text-align-center">Registering to Vote</h2>



<p>Republicans say the bill is needed to prevent noncitizens from voting in federal elections, though election experts say, and state audits <a href="https://www.factcheck.org/2025/04/musks-unsupported-claim-to-have-unveiled-massive-illegal-voting-by-noncitizens/" target="_blank" rel="noreferrer noopener">have shown</a>, this is rare. </p>



<p>Current&nbsp;<a href="https://www.congress.gov/bill/103rd-congress/house-bill/2/text" target="_blank" rel="noreferrer noopener">federal law</a>&nbsp;requires those registering to vote to attest that they are citizens under penalty of perjury.&nbsp;The SAVE America Act would require documentary proof, presented in person to election officials, for those registering or reregistering to vote.</p>



<p>This would happen &#8220;any time you conduct what we call a registration transaction, which usually comes from a life event, a move or a change of name,” <a href="https://electioninnovation.org/team/david-becker/" target="_blank" rel="noreferrer noopener">David Becker</a>, founder and executive director of the nonpartisan Center for Election Innovation &amp; Research, which works with election officials throughout the country, said in a March 18 media briefing.</p>



<p>For most people, this would likely mean showing a U.S. passport or a certified birth certificate along with a driver&#8217;s license or government-issued photo ID. As <a href="https://www.factcheck.org/2026/03/qa-on-the-save-america-act/" target="_blank" rel="noreferrer noopener">we&#8217;ve explained</a>, the bill stipulates elements the birth certificate must have, such as a government seal.  </p>



<p>Some voters could prove citizenship with other documents. A REAL ID driver&#8217;s license doesn&#8217;t typically show citizenship, but <a href="https://www.dhs.gov/enhanced-drivers-licenses-what-are-they" target="_blank" rel="noreferrer noopener">five states</a>&nbsp;issue REAL IDs that do. Also acceptable under the bill: a military ID and service record that says the person was born in the U.S., or a government-issued photo ID that shows a U.S. birthplace. Those with government-issued photo IDs that don&#8217;t indicate citizenship would also need either the certified birth certificate or a hospital birth record, adoption decree, a&nbsp;<a href="https://travel.state.gov/content/travel/en/international-travel/while-abroad/birth-abroad.html" target="_blank" rel="noreferrer noopener">consular birth report</a>,&nbsp;a naturalization certificate, or an American Indian card with the&nbsp;<a href="https://fam.state.gov/FAM/08FAM/08FAM030209.html" target="_blank" rel="noreferrer noopener">classification “KIC,”</a>&nbsp;which designates U.S. citizenship for Mexican-born members of the Kickapoo tribes of Texas and Oklahoma.&nbsp;</p>



<p>As we said, surveys show millions of Americans could have trouble producing the proper citizenship documents. In addition to the 2023 survey Schumer has cited, the Bipartisan Policy Center, in&nbsp;<a href="https://bipartisanpolicy.org/article/do-documentary-proof-of-citizenship-requirements-disadvantage-one-party-more-than-the-other/" target="_blank" rel="noreferrer noopener">analyzing</a>&nbsp;the 2024&nbsp;<a href="https://electionlab.mit.edu/research/projects/survey-performance-american-elections" target="_blank" rel="noreferrer noopener">Survey on the Performance of American Elections</a>, found that 12% of registered voters, the equivalent of 28.4 million citizens of voting age, lacked either a valid passport or a birth certificate they could easily find along with a valid government-issued photo ID.</p>



<p>For those who do have the proper documents, the requirement to show them &#8220;in person&#8221; could dissuade others from registering to vote. The bill says that people registering by mail won&#8217;t be registered unless they present &#8220;documentary proof of United States citizenship in person to the office of the appropriate election official.&#8221; </p>



<p>Sweren-Becker said that this in-person requirement would be &#8220;especially hard&#8221; for &#8220;working parents, people with disabilities, elderly voters, voters who live in rural areas.&#8221; </p>



<p>The bill calls for states to make unspecified &#8220;reasonable accommodations&#8221; for people with disabilities. </p>



<p>Republican Sen. Mike Lee <a href="https://www.congress.gov/119/crec/2026/03/19/172/50/CREC-2026-03-19-pt1-PgS1411.pdf" target="_blank" rel="noreferrer noopener">said</a> on the Senate floor on March 19 that claims about the legislation disenfranchising voters were wrong. &#8220;Ideally&#8221; Americans have the proper documents, he said, but &#8220;even if you do not have a single shred of documentation as to your citizenship — you can’t find it, it burned down, whatever it is — all you have to do is swear an affidavit.&#8221;</p>



<p>&#8220;The state is in a very good position to track down the details of the affidavit and easily confirm or refute what the person says,&#8221; Lee said.</p>



<p>The bill does provide a process for those who don&#8217;t have the required documents. It says: &#8220;Subject to any relevant guidance adopted by the Election Assistance Commission, each State shall establish a process under which an applicant who cannot provide documentary proof of United States citizenship &#8230; may, if the applicant signs an attestation under penalty of perjury that the applicant is a citizen of the United States and eligible to vote in elections for Federal office, submit such other evidence to the appropriate State or local official demonstrating that the applicant is a citizen of the United States and such official shall make a determination as to whether the applicant has sufficiently established United States citizenship for purposes of registering to vote in elections for Federal office in the State.&#8221;</p>



<p>The election official making that determination also would need to sign an affidavit &#8220;swearing or affirming the applicant sufficiently established United States citizenship for purposes of registering to vote.&#8221;</p>



<p>There&#8217;s a similar process for people whose names differ from their documents, such as married women who changed their names. They can provide &#8220;additional documentation&#8221; on the name discrepancy or sign an affidavit. </p>



<p>Olson said there&#8217;s uncertainty about these alternative methods of citizenship verification. Will they &#8220;be relatively easy and generous, accepting common sorts of documents and an uncomplicated sworn statement that most eligible persons will feel comfortable signing?&#8221; he asked. </p>



<p>States&#8217; procedures will be governed by guidance from the <a href="https://www.eac.gov/about/commissioners" target="_blank" rel="noreferrer noopener">Election Assistance Commission</a>, the bill says, an independent agency that has two commissioners appointed by Trump and two appointed by former President Barack Obama. </p>



<p>&#8220;In short, we aren&#8217;t going to find out what the bill does on many key questions until after we pass it into law and the EAC begins issuing guidance,&#8221; Olson said. &#8220;One of the reasons I am critical of the bill is that I don&#8217;t believe we should be asked to take it on faith that the EAC will issue practical guidance in good faith. If the EAC is going to issue guidance that causes an uproar because it sets requirements many legitimate voters cannot meet, we should know that now, not later.&#8221;</p>



<p>Sweren-Becker said that the affidavit method &#8220;is only available if a state or local election official deems that the registered has sufficiently established U.S. citizenship &#8230; so it leaves an enormous amount of discretion in local and state election officials&#8217; hands.&#8221; The bill also would impose criminal penalties and civil liability on election officials who register someone &#8220;who fails to present documentary proof of United States citizenship,&#8221; the legislation says. &#8220;So in practice,&#8221; she said, election officials &#8220;will face a lot of pressure to construe it [the affidavit method] very, very, very narrowly out of rightful concern about their own liability,&#8221; Sweren-Becker said. </p>



<p>Becker, in the March 18 briefing, said the legislation &#8220;would incredibly negatively impact voters across the political spectrum. … I don&#8217;t think there&#8217;s anyone who can say definitively, if this were to pass, which party would be hurt more by it,&#8221; he said. &#8220;I think it&#8217;s highly likely that Republicans would likely be more hurt&#8221; than Democratic voters, &#8220;because a lot of the voters who have difficulty digging up their documentary proof of citizenship are Republicans.&#8221;</p>



<h2 class="wp-block-heading has-text-align-center">Casting a Vote</h2>



<p>In pushing back on Schumer&#8217;s comments about disenfranchisement, Cornyn spoke about the bill&#8217;s photo ID requirements for casting a vote. &#8220;Thirty-eight states, including states like Georgia and Rhode Island, currently represented by Democrats, require voter ID,&#8221; he said.</p>



<p>As we said, 36 states do have some form of voter ID laws, but the SAVE America Act is &#8220;stricter&#8221; than most of them, <a href="https://www.ncsl.org/state-legislatures-news/details/9-things-to-know-about-the-proposed-save-america-act" target="_blank" rel="noreferrer noopener">according to the National Conference of State Legislatures</a>. </p>



<p>The Republican bill would require&nbsp;“a valid physical photo identification” in order to cast a ballot in person. Those voting by mail would need to submit a copy of a photo ID, or the last four numbers of their Social Security number and an affidavit saying that they couldn&#8217;t obtain a copy of their ID.</p>



<p>A valid photo ID under the bill includes: a state-issued driver’s license or ID card issued by the motor vehicle agency that includes a photo and expiration date, a U.S. passport, a military ID, or a photo ID issued by a tribal government that includes an expiration date. There are exceptions for overseas uniformed services members and those who have the right to vote absentee via the Voting Accessibility for the Elderly and Handicapped Act.</p>



<p>The NCSL said most states&#8217; laws are less strict. &#8220;Currently, each state determines the types of ID acceptable to vote, and that often includes student IDs, hunting and fishing licenses or other state-specific identification cards,&#8221; it said in a post on its website updated in March.</p>



<p>Thirteen states also&nbsp;<a href="https://www.ncsl.org/elections-and-campaigns/voter-id" target="_blank" rel="noreferrer noopener">accept</a>&nbsp;non-photo identification, such as a bank statement. NCSL classified 10 of the voter ID states as having &#8220;strict photo ID&#8221; laws. </p>



<p><a href="https://law.justia.com/codes/georgia/title-21/chapter-2/article-11/part-1/section-21-2-417/" target="_blank" rel="noreferrer noopener">Georgia</a> is one of them, but it still accepts a broader range of documents than the SAVE America Act would. Georgia accepts a student ID from a public college in the state, an expired state driver’s license, an employee photo ID from a government entity, or a free voter ID card issued by the state, among other documents, the Georgia Secretary of State&#8217;s office <a href="https://sos.ga.gov/page/georgia-voter-identification-requirements" target="_blank" rel="noreferrer noopener">explains</a>. To get an absentee ballot, a voter submits the number on a driver&#8217;s license or state-issued ID card, or a photo or copy of another listed ID, or a document that shows a name and address, such as a utility bill, bank statement or paycheck.</p>



<p>NCSL puts <a href="https://webserver.rilegislature.gov/Statutes/TITLE17/17-19/17-19-24.2.htm" target="_blank" rel="noreferrer noopener">Rhode Island</a> in its “non-strict photo ID” category, along with 13 other states. Rhode Island also issues free voter ID cards and accepts “ID issued by a U.S. educational institution,&#8221; the state Board of Elections <a href="https://elections.ri.gov/voter-registration/voter-id" target="_blank" rel="noreferrer noopener">says</a>. No ID is required to cast a ballot by mail. </p>



<p>When we asked Cornyn&#8217;s office about his comments, a spokesperson pointed to some of his other remarks, including a March 19 post on X, which <a href="https://x.com/JohnCornyn/status/2034745920487608494?s=20" target="_blank" rel="noreferrer noopener">said</a>: &#8220;These tactics are nothing more than&nbsp;fearmongering&nbsp;by Dems who are objecting to this because they want to make it easier for people to cheat. In a country with citizens bright enough to put a man on the moon and to build the strongest, most powerful military&nbsp;&amp; the greatest economy the world has ever known,&nbsp;Americans are smart enough and capable enough to be able to locate their driver&#8217;s license when they cast a ballot and to establish their citizenship in order to qualify to vote. Any suggestion to the contrary is ridiculous.&#8221;</p>



<h2 class="wp-block-heading has-text-align-center">Purging Voter Rolls</h2>



<p>Schumer also objected to the bill&#8217;s provision requiring states to submit their voter rolls to DHS&#8217; Systematic Alien Verification for Entitlements program and remove noncitizens from their rolls. The legislation &#8220;could purge millions of American citizens from the voter rolls,&#8221; Schumer <a href="https://www.c-span.org/program/news-conference/senate-democratic-agenda/675651" target="_blank" rel="noreferrer noopener">said</a> in the March 17 press conference. He later added: &#8220;Our objection is it&#8217;s a voter suppression bill. Twenty million, maybe more people, when they show up to vote &#8230; will be told, you&#8217;re off the rolls.&#8221;</p>



<p>On the Senate floor that same day, he repeated the idea that people could be removed from voter rolls and not know about it until they try to cast a vote. &#8220;The way this works, you don’t have to be notified if you’re kicked off the rolls. You show up on Election Day and they say, &#8216;We’re sorry Mr. Smith, Ms. Jones, you’re not on the rolls anymore.&#8217; And then they make it impossible to re-register. Certainly, on that day you lose your right to vote,&#8221; the senator <a href="https://www.democrats.senate.gov/news/press-releases/leader-schumer-floor-remarks-on-democrats-plan-to-block-republicans-voter-suppression-bill-the-save-act" target="_blank" rel="noreferrer noopener">said</a>. </p>



<p>In March 15 remarks, he <a href="https://www.democrats.senate.gov/news/press-releases/transcript-leader-schumer-and-legal-experts-on-the-dangers-of-the-save-america-act-ahead-of-upcoming-senate-vote" target="_blank" rel="noreferrer noopener">said</a> the bill&#8217;s requirements for states to use the DHS system &#8220;will purge tens of millions of people from the voter rolls. Once purged, you don&#8217;t even know it.&#8221;</p>



<p>There are a couple of provisions regarding purging voters. The first requires states to use the DHS system “for the purposes of identifying individuals who are not citizens of the United States and taking the necessary steps to remove such individuals who are not citizens from the official list, after notice is given to such individuals and such individuals are given the opportunity to provide documentary proof of United States citizenship.” As <a href="https://www.factcheck.org/2026/03/qa-on-the-save-america-act/" target="_blank" rel="noreferrer noopener">we&#8217;ve explained</a>, the DHS system has been shown to have flaws and has wrongly identified people as being noncitizens.</p>



<p>When we asked Schumer&#8217;s office about the language in the bill, a spokesperson said the bill included &#8220;a requirement that they [voters] be told they have been flagged,&#8221; but no requirements about what form the notice would take or the &#8220;length of time&#8221; people would be given to respond. And there&#8217;s &#8220;no language in the bill about notice to the voter that they have been purged,&#8221; the spokesperson said. </p>



<p>The bill doesn&#8217;t provide more details on how states should give &#8220;notice&#8221; and an opportunity to dispute incorrect information before removing people from the rolls; nor does it say people should be notified again before being purged. </p>



<p>There&#8217;s another provision in the bill that says states could remove someone &#8220;at any time.&#8221; It says: &#8220;A State shall remove an individual who is not a citizen of the United States from the official list of eligible voters for elections for Federal office held in the State at any time upon receipt of documentation or verified information that a registrant is not a United States citizen.&#8221; That provision doesn&#8217;t say anything about a notice given before removing someone.</p>



<p>Election experts told us there&#8217;s ambiguity in the bill regarding these provisions. We reached out to the offices of Sen. Lee and Rep. Chip Roy, the authors of the legislation, about this issue, but we haven&#8217;t yet received a response.</p>



<p>&#8220;[I]t’s not obvious that all of the ways people will be removed from the rolls will be subject by the SAVE Act to notice and an opportunity to respond,&#8221; <a href="https://www.lls.edu/faculty/justinlevitt/" target="_blank" rel="noreferrer noopener">Justin Levitt</a>, a professor of constitutional law at Loyola Marymount University’s law school, told us in an email. &#8220;I’d think there are constitutional protections that would kick in, but they’re not explicit in the statute, and that’d take someone litigating.&#8221; Levitt, who briefly was a White House senior policy adviser on voting rights during the Biden administration, said the bill &#8220;seems to contemplate at least some people being kicked off the rolls without being told,&#8221; though this could be a mistake in the drafting of the bill. </p>



<p>&#8220;As for how many, it’s a question I can’t answer,&#8221; he said, explaining that it depends on the accuracy of the SAVE database and how the process of comparing voter rolls works. </p>



<p>Olson told us that the provision on using the DHS SAVE system &#8220;appears to establish protections (notification and a chance to contest removal by supplying documents)&#8221; for voters flagged for removal under that system. But &#8220;some other persons removed from the voter rolls may not have rights to notification and challenge unless their states have separately legislated to provide such rights,&#8221; he said, pointing to the provision on states removing noncitizens &#8220;at any time.&#8221;</p>



<p>&#8220;So far as I can tell, this means that anyone, including the federal government or some private person or group, can send &#8216;documentation or verified information&#8217; to a state that a certain person, or a list of persons, on its voter rolls are not U.S. citizens. The state then &#8216;shall&#8217; remove them,&#8221; Olson said. &#8220;So long as this is not being done by the method carved out for the SAVE database and its intersection with state voter rolls in federal possession, I don&#8217;t see where the bill provides any assurance of notification.&#8221;</p>



<p>Sweren-Becker had the same reading of the bill. &#8220;Absolutely, I think that the second provision &#8230; indicates that people could be removed, but on the basis that something has flagged them as a noncitizen, without notice to the voter or an opportunity to provide evidence of their citizenship,&#8221; she told us. &#8220;And it is also important to note that it is very unclear what &#8216;documentation or verified information&#8217; means&#8221; and from what sources. &#8220;I think there&#8217;s a risk that election officials may receive, essentially, purge lists generated by activist groups who are not doing careful list matching.&#8221;</p>



<p>As for how many legitimate voters could be removed from voter rolls through this process, &#8220;I don&#8217;t know how to hazard a guess there,&#8221; Sweren-Becker said, noting that &#8220;shoddy&#8221; purge lists by activist groups have listed thousands of people. </p>



<p>Schumer, however, has gone as far as saying that, under the bill, 20 million could be wrongly purged without knowing they were removed from the voter rolls. But that figure comes from the estimate of those lacking easy access to a passport, birth certificate or naturalization papers. It&#8217;s not an estimate of voters who could be purged without their knowledge.</p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<p><em>Editor’s note: FactCheck.org does not accept advertising. We rely on grants and individual donations from people like you. Please consider a donation. Credit card donations may be made through <a href="https://giving.aws.cloud.upenn.edu/?fastStart=simpleForm&amp;program=ANS&amp;fund=602014" target="_blank" rel="noreferrer noopener">our “Donate” page</a>. If you prefer to give by check, send to: FactCheck.org, Annenberg Public Policy Center, P.O. Box 58100, Philadelphia, PA 19102. </em></p>
<p>The post <a href="https://www.factcheck.org/2026/03/competing-claims-on-save-america-act-disenfranchising-voters/">Competing Claims on SAVE America Act Disenfranchising Voters</a> appeared first on <a href="https://www.factcheck.org">FactCheck.org</a>.</p>
]]></content:encoded>
					
		
		
			</item>
		<item>
		<title>Q&#038;A on the SAVE America Act</title>
		<link>https://www.factcheck.org/2026/03/qa-on-the-save-america-act/</link>
		
		<dc:creator><![CDATA[Lori Robertson]]></dc:creator>
		<pubDate>Wed, 18 Mar 2026 22:30:09 +0000</pubDate>
				<category><![CDATA[FactCheck Posts]]></category>
		<category><![CDATA[Featured Posts]]></category>
		<guid isPermaLink="false">https://www.factcheck.org/?p=281283</guid>

					<description><![CDATA[<p><img width="640" height="273" src="https://cdn.factcheck.org/UploadedFiles/SAVE-720-x-307.png" class="attachment-medium_large size-medium_large wp-post-image" alt="" style="float:left; margin:0 15px 15px 0;" decoding="async" loading="lazy" srcset="https://cdn.factcheck.org/UploadedFiles/SAVE-720-x-307.png 720w, https://cdn.factcheck.org/UploadedFiles/SAVE-720-x-307-340x145.png 340w" sizes="auto, (max-width: 640px) 100vw, 640px" />On March 17, the Senate began debate on the SAVE America Act, a Republican-backed voter identification and registration bill that passed the House last month. Here, we answer several questions about the legislation, many of them asked by our readers.</p>
<p>The post <a href="https://www.factcheck.org/2026/03/qa-on-the-save-america-act/">Q&amp;A on the SAVE America Act</a> appeared first on <a href="https://www.factcheck.org">FactCheck.org</a>.</p>
]]></description>
										<content:encoded><![CDATA[<img width="640" height="273" src="https://cdn.factcheck.org/UploadedFiles/SAVE-720-x-307.png" class="attachment-medium_large size-medium_large wp-post-image" alt="" style="float:left; margin:0 15px 15px 0;" decoding="async" loading="lazy" srcset="https://cdn.factcheck.org/UploadedFiles/SAVE-720-x-307.png 720w, https://cdn.factcheck.org/UploadedFiles/SAVE-720-x-307-340x145.png 340w" sizes="auto, (max-width: 640px) 100vw, 640px" />
<p>On March 17, the Senate began debate on the SAVE America Act, a Republican-backed voter identification and registration bill that passed the House last month. Here, we answer several questions about the legislation, many of them asked by our readers.</p>



<p>Previous versions of the bill, called only the SAVE Act, died in the Senate, where the measure hasn&#8217;t garnered 60 votes to overcome a <a href="https://www.senate.gov/about/powers-procedures/filibusters-cloture.htm" target="_blank" rel="noreferrer noopener">filibuster</a> and force a final vote. The new legislation could well face a similar fate &#8212; eventually &#8212; but the Republican leadership is holding a <a href="https://thehill.com/homenews/senate/5788105-senate-save-america-act-debate/" target="_blank" rel="noreferrer noopener">weeklong (or so) debate</a> in an effort to attract support. </p>



<p><a href="https://electioninnovation.org/team/david-becker/" target="_blank" rel="noreferrer noopener">David Becker</a>, founder and executive director of the nonpartisan Center for Election Innovation &amp; Research, which works with election officials throughout the country, said in a March 18 media briefing that it was &#8220;extremely unlikely, if not impossible, that this passes.&#8221; He predicted that &#8220;next week, we&#8217;re not going to be talking about this.&#8221;</p>



<p>But this week, the Senate is going to be talking about it a lot. On the opening day of debate, Senate Majority Leader John Thune <a href="https://www.thune.senate.gov/public/index.cfm/press-releases?ID=FBAB7E8E-8A3C-4848-B426-3BD1A1F7FC61" target="_blank" rel="noreferrer noopener">called</a> the bill &#8220;a package of commonsense measures&#8221; that was about &#8220;ensuring that those who are registered to vote are eligible to vote – and that those who show up to vote at polling places are &#8230; who they say they are.&#8221; Senate Minority Leader Chuck Schumer <a href="https://www.democrats.senate.gov/news/press-releases/leader-schumer-floor-remarks-on-democrats-plan-to-block-republicans-voter-suppression-bill-the-save-act" target="_blank" rel="noreferrer noopener">called</a> it &#8220;in every sense a voter suppression bill&#8221; that could &#8220;disenfranchise&#8221; millions of American citizens.</p>



<p>The <a href="https://www.congress.gov/bill/119th-congress/senate-bill/1383/text" target="_blank" rel="noreferrer noopener">SAVE America Act</a> (or Safeguard American Voter Eligibility Act), <a href="https://perma.cc/GP9C-UNSS" target="_blank" rel="noreferrer noopener">passed</a> the House on Feb. 11. The bill aims to prevent voting in federal elections by people who aren&#8217;t U.S. citizens &#8212; something that election experts say is a rare occurrence. Unlike <a href="https://www.factcheck.org/2025/02/will-save-act-prevent-married-women-from-registering-to-vote/" target="_blank" rel="noreferrer noopener">last year&#8217;s SAVE Act</a>, the bill also would require voters to present photo identification before casting a vote, whether by mail or in person. And states would have to use a Department of Homeland Security system to check the citizenship status of people on their voter rolls.</p>



<p>President Donald Trump has demanded that other measures be added to the legislation, including abolishing most mail-in voting.</p>



<p>We&#8217;ll explain more about the bill below. </p>



<h2 class="wp-block-heading"><strong>Would registered voters be required to reregister with proper documentation to vote?</strong></h2>



<p>There&#8217;s no requirement in the bill for all registered voters to reregister. However, if a voter did need to reregister for other reasons, such as moving or changing their name, they would have to show documentation proving their citizenship. &#8220;Under any method of voter registration in a State, the State shall not accept and process an application to register to vote in an election for Federal office unless the applicant presents documentary proof of United States citizenship with the application,&#8221; the legislation <a href="https://www.congress.gov/bill/119th-congress/senate-bill/1383/text" target="_blank" rel="noreferrer noopener">says</a>.</p>


<div class="wp-block-image">
<figure class="alignleft size-full"><img loading="lazy" decoding="async" width="400" height="267" src="https://cdn.factcheck.org/UploadedFiles/SAVE-400-x-267.png" alt="" class="wp-image-281333" srcset="https://cdn.factcheck.org/UploadedFiles/SAVE-400-x-267.png 400w, https://cdn.factcheck.org/UploadedFiles/SAVE-400-x-267-217x145.png 217w" sizes="auto, (max-width: 400px) 100vw, 400px" /><figcaption class="wp-element-caption">Voting booths and voters at a polling location on Election Day, Nov. 5, 2024, in Beltsville, Maryland. Photo by Graeme Sloan/Washington Post via Getty Images.</figcaption></figure></div>


<p>Ceridwen Cherry, legal director of <a href="https://voteriders.org/" target="_blank" rel="noreferrer noopener">VoteRiders</a>, a nonpartisan group that helps people get an acceptable form of identification so they can vote, told us that &#8220;any change to the registration would require documents to prove citizenship under the SAVE America Act. The statute is drafted broadly enough to encompass all changes to registration.&#8221;&nbsp;</p>



<p>VoteRiders&#8217; mission is &#8220;to eliminate ID barriers to the ballot box so every eligible voter can cast a ballot that counts,&#8221; and as such, it opposes this legislation. </p>



<p>Becker, who said the legislation would &#8220;expansively &#8230; alter voting in every single state,&#8221; costing &#8220;tens, perhaps hundreds of millions of dollars,&#8221; said voters would need to prove citizenship under the bill &#8220;any time you conduct what we call a registration transaction, which usually comes from a life event, a move or a change of name.&#8221; (He also said that &#8220;in talking with election officials across the country, I have yet to find really any election official who supports this on either side of the aisle. It would make their jobs extremely more difficult&#8221; while primaries are occurring and months away from the general midterm elections.)</p>



<p>Current <a href="https://web.archive.org/web/20250206202455/https:/www.congress.gov/bill/103rd-congress/house-bill/2/text?utm_source=FactCheck.org&amp;utm_campaign=410d12417a-EMAIL_CAMPAIGN_2026_03_12_09_08&amp;utm_medium=email&amp;utm_term=0_-410d12417a-">f</a><a href="https://web.archive.org/web/20250206202455/https:/www.congress.gov/bill/103rd-congress/house-bill/2/text?utm_source=FactCheck.org&amp;utm_campaign=410d12417a-EMAIL_CAMPAIGN_2026_03_12_09_08&amp;utm_medium=email&amp;utm_term=0_-410d12417a-" target="_blank" rel="noreferrer noopener">e</a><a href="https://web.archive.org/web/20250206202455/https:/www.congress.gov/bill/103rd-congress/house-bill/2/text">deral law</a> requires those registering to vote to attest that they are citizens under penalty of perjury. The SAVE America Act would require people to present citizenship documents in person to election officials, even if they are registering by mail. </p>



<h2 class="wp-block-heading"><strong>What documents would be accepted to prove citizenship?</strong></h2>



<p>For most Americans registering to vote, proving citizenship would mean presenting either only a U.S. passport, or a certified birth certificate along with a driver&#8217;s license or other government-issued photo ID. The legislation lists requirements the birth certificate must meet, such as including the full names of at least one parent, the signature of an authorized government official, and the seal of the state or local/tribal government that issued it. </p>



<p>The Bipartisan Policy Center <a href="https://bipartisanpolicy.org/article/do-documentary-proof-of-citizenship-requirements-disadvantage-one-party-more-than-the-other/" target="_blank" rel="noreferrer noopener">noted</a> in a March 16 post that not all birth certificates include all of the criteria. About 53% of the <a href="https://www.census.gov/popclock/">U.S. population</a> has a U.S. passport, <a href="https://travel.state.gov/content/travel/en/about-us/reports-and-statistics.html" target="_blank" rel="noreferrer noopener">according to Department of State data</a>.</p>



<p>These are other types of documents besides a passport that would suffice to prove citizenship under the bill: a REAL ID driver&#8217;s license that indicates citizenship (<a href="https://www.dhs.gov/enhanced-drivers-licenses-what-are-they" target="_blank" rel="noreferrer noopener">five states</a> have such &#8220;enhanced&#8221; driver&#8217;s licenses that include citizenship); a military ID and service record that says the person was born in the U.S.; or a government-issued photo ID that shows a U.S. birthplace. If presenting a government-issued photo ID that doesn&#8217;t say the person was born in the U.S. or has citizenship, a registrant would also need either the certified birth certificate or a hospital birth record, adoption decree, a <a href="https://travel.state.gov/content/travel/en/international-travel/while-abroad/birth-abroad.html" target="_blank" rel="noreferrer noopener">consular birth report</a>, a naturalization certificate, or an American Indian card with the <a href="https://fam.state.gov/FAM/08FAM/08FAM030209.html" target="_blank" rel="noreferrer noopener">classification “KIC,”</a> which designates U.S. citizenship for Mexican-born members of the Kickapoo tribes of Texas and Oklahoma. </p>



<p>The Bipartisan Policy Center <a href="https://bipartisanpolicy.org/article/do-documentary-proof-of-citizenship-requirements-disadvantage-one-party-more-than-the-other/" target="_blank" rel="noreferrer noopener">analyzed</a> the 2024 <a href="https://electionlab.mit.edu/research/projects/survey-performance-american-elections" target="_blank" rel="noreferrer noopener">Survey on the Performance of American Elections</a> conducted by the MIT Election Data + Science Lab and found that 12% of registered voters lacked either a passport or a birth certificate along with a government-issued photo ID &#8212; the most common ways people would prove citizenship under this bill. The analysis also found that &#8220;wealthier and more highly educated voters are more likely to have documentary proof than others.&#8221; It found that &#8220;registered Democrats are more likely to have a valid passport than registered Republicans&#8221; and &#8220;Republicans are more likely to have a birth certificate than Democrats.&#8221;</p>



<p>According to <a href="https://www.brennancenter.org/our-work/analysis-opinion/millions-americans-dont-have-documents-proving-their-citizenship-readily" target="_blank" rel="noreferrer noopener">a 2023 survey</a> by New York University&#8217;s Brennan Center for Justice and other groups, more than 9% of Americans of voting age, or 21.3 million people, didn&#8217;t have easy access to citizenship documents, meaning they wouldn&#8217;t be able to “quickly find” such documents if they “had to show it tomorrow.” The percentage was 11% for Americans who did not identify as white. </p>



<p>In a summary of the bill, the nonpartisan Congressional Research Service <a href="https://www.congress.gov/crs-product/IF12902" target="_blank" rel="noreferrer noopener">explains</a> that if people lack valid documents, &#8220;the bill would require states to establish a process whereby applicants could submit other documentation and sign an attestation under penalty of perjury that the applicant is a U.S. citizen and eligible to vote in federal elections.&#8221; If the person lacks documentation, the bill also would require the election official to sign an affidavit saying the registrant sufficiently demonstrated citizenship.</p>



<h2 class="wp-block-heading"><strong>What about married women or others who have changed their names?</strong></h2>



<p>We received several questions from readers who are married, or divorced, and have changed their names, asking about how they can prove citizenship and ensure they can vote, should this bill become law. We <a href="https://www.factcheck.org/2025/02/will-save-act-prevent-married-women-from-registering-to-vote/" target="_blank" rel="noreferrer noopener">wrote</a> about these concerns last year as well. The bill includes a provision on name discrepancies, requiring states to establish a process for those registrations. (Again, voters who are already registered wouldn&#8217;t need to prove citizenship under legislation unless they needed to reregister.)</p>



<p>Cherry, with VoteRiders, told us that &#8220;if a voter has experienced a name change they would not be able to use their birth certificate as their only proof of citizenship as this document does not get updated if someone changes their name through marriage or divorce. They also could not use any of the other listed documents (e.g. passport) as their sole proof of citizenship if their name on the document does not match their current legal name.&#8221;</p>



<p>The bill requires states to set up a process to accommodate this. &#8220;Voters will either be able to provide &#8216;additional documentation as necessary to establish that the name on the documentation is a previous name of the applicant&#8217; or &#8216;an affidavit signed by the applicant attesting that the name on the documentation is a previous name of the applicant,'&#8221; Cherry said. &#8220;The bill text does not lay out exactly what this process will be or what additional documentation would be accepted. It also leaves open the possibility for inconsistent rules between states.&#8221;</p>



<p>In general, the bill calls for the federal <a href="https://www.eac.gov/" target="_blank" rel="noreferrer noopener">Election Assistance Commission</a>, an independent, bipartisan agency, to issue guidance to states on implementing the legislation within 10 days of its enactment. </p>



<p>When we wrote about the SAVE Act last year, <a href="https://www.brennancenter.org/about/leadership/wendy-r-weiser" target="_blank" rel="noreferrer noopener">Wendy Weiser</a>, vice president for democracy at the Brennan Center, raised concerns about criminal penalties in the bill for election officials. That provision remains in this year&#8217;s legislation. Weiser told us, “Any state process would be severely undercut by&nbsp;another provision in the bill making it a federal crime for election officials to register anyone who does not present ‘documentary proof of citizenship.’ How many election officials would be willing to risk incarceration and steep fines to register someone whose documentation does not match their current name?”</p>



<p>In a statement to us last year, Republican Rep. Chip Roy of Texas, who introduced the SAVE Act in the House and this year&#8217;s SAVE America Act, said concern over married women not being able to register to vote was “absurd armchair speculation.” He said the bill &#8220;provides a myriad [of] ways for people to prove citizenship and explicitly directs States to establish a process for individuals to register to vote if there are discrepancies in their proof of citizenship documents due to something like a name change.”&nbsp;</p>



<h2 class="wp-block-heading"><strong>What identification would people need in order to cast a vote?</strong></h2>



<p>New in this year&#8217;s legislation is a nationwide voter photo ID requirement. Those voting in person would need to present &#8220;a valid physical photo identification&#8221; in order to cast a ballot. Those voting by mail would need to provide a copy of the photo ID.</p>



<p>Those who don&#8217;t have an ID for in-person voting could cast a provisional ballot and then would have three days to present their ID to election officials &#8212; or sign an affidavit &#8220;attesting that the individual does not possess the identification required &#8230; because the individual has a religious objection to being photographed.&#8221;</p>



<p>For by-mail voters, they also could submit the last four numbers of their Social Security number and an affidavit &#8220;attesting that the individual is unable to obtain a copy of a valid photo identification after making reasonable efforts to obtain such a copy.&#8221; </p>



<p>A valid photo ID for this purpose includes: a state-issued driver&#8217;s license or ID card issued by the motor vehicle agency that includes a photo and expiration date, a U.S. passport, a military ID, or a photo ID issued by a tribal government that includes an expiration date.</p>



<p>The National Conference of State Legislatures, which tracks state legislation, <a href="https://www.ncsl.org/state-legislatures-news/details/9-things-to-know-about-the-proposed-save-america-act" target="_blank" rel="noreferrer noopener">has said</a> that these voter ID requirements &#8220;are stricter than those that exist in most states.&#8221; In a Feb. 19 post, NCSL staff wrote, &#8220;While 36 states currently have voter ID requirements to vote, state approaches vary. Just 10 states fall into the strict photo ID category, as defined by NCSL.&#8221;</p>



<p>An acceptable ID for these 36 states &#8220;often includes student IDs, hunting and fishing licenses or other state-specific identification cards.&#8221; Thirteen states <a href="https://www.ncsl.org/elections-and-campaigns/voter-id" target="_blank" rel="noreferrer noopener">accept</a> non-photo identification, such as a bank statement. That&#8217;s broader than what the SAVE America Act would accept.</p>



<p>There are exceptions to the by-mail ID requirements for overseas uniformed services members and those who have the right to vote absentee via the Voting Accessibility for the Elderly and Handicapped Act.</p>



<h2 class="wp-block-heading"><strong>How often have noncitizens voted in federal elections?</strong></h2>



<p>We&#8217;ve <a href="https://www.factcheck.org/issue/noncitizen-voting/" target="_blank" rel="noreferrer noopener">written</a> about this issue a few times. Last April, we <a href="https://www.factcheck.org/2025/04/musks-unsupported-claim-to-have-unveiled-massive-illegal-voting-by-noncitizens/?utm_source=FactCheck.org&amp;utm_campaign=410d12417a-EMAIL_CAMPAIGN_2026_03_12_09_08&amp;utm_medium=email&amp;utm_term=0_-410d12417a-" target="_blank" rel="noreferrer noopener">explained</a> that detailed audits of voting records by some states had found instances of noncitizens casting votes to be relatively rare. In some cases, officials in those states found hundreds of noncitizens on voter registration rolls, a fraction of whom also voted.</p>



<p>Noncitizens convicted of voting in federal elections face fines, jail time and deportation.</p>



<p>“The evidence is that the number of noncitizens illegally voting in federal elections is extremely low, not high enough to have changed the party outcome of any federal election in recent years,” Walter Olson, a senior fellow at the Cato Institute told us. “Audits and investigations in states like Ohio, Nevada, and North Carolina have found the numbers to be tiny in relation to votes cast. … The consistent experience has been that very few persons in this category mistakenly or deliberately vote.”</p>



<p>For instance, the Ohio Secretary of State&nbsp;<a href="https://www.ohiosos.gov/media-center/press-releases/2024/2024-05-14a/">announced</a> in May 2024 that it found 137 people on the state’s voter registration rolls who had twice confirmed their noncitizenship status to the state motor vehicles bureau. The announcement didn&#8217;t say whether any had tried to actually vote. A grand jury&nbsp;<a href="https://www.cleveland.com/open/2024/10/grand-jury-indicts-six-legal-noncitizen-immigrants-for-felony-illegal-voting.html">indicted</a>&nbsp;six people who legally and permanently immigrated to the U.S. for voting illegally as noncitizens between 2008 and 2020. In Georgia, a 2022 review found that 1,634 people had attempted to register to vote between&nbsp;<a href="https://www.upi.com/Top_News/US/2025/04/01/president-trump-proof-citizenship-vote-order/8941743512341/">1997 and 2022</a>&nbsp;and could not be verified as citizens. None had voted. In October 2024, the Associated Press&nbsp;<a href="https://apnews.com/article/georgia-noncitizens-voter-rolls-14532ef49b66f9cbf34ff483d2534280">reported</a>&nbsp;that Georgia election officials said 20 out of the 8.2 million on the state’s voter registration rolls were not U.S. citizens, and that nine had voted in previous elections.</p>



<p>The&nbsp;Bipartisan Policy Center&nbsp;<a href="https://bipartisanpolicy.org/blog/four-things-to-know-about-noncitizen-voting/" target="_blank" rel="noreferrer noopener">analyzed</a> a database of fraud cases compiled by the conservative Heritage Foundation and found “only 77 instances of noncitizen voting between 1999 and 2023.”</p>



<p>Last April, we were writing about unsupported claims from Elon Musk and the Department of Government Efficiency to have found evidence of large-scale voting by noncitizens. DOGE said it provided data to federal prosecutors for investigation. But nearly a year later, nothing has been made public about that investigation.</p>



<p>More recently, <a href="https://electioninnovation.org/research/noncitizen-analysis-update/" target="_blank" rel="noreferrer noopener">a systematic review</a> of claims about noncitizen registrants and voters in all 50 states by the Center for Election Innovation &amp; Research, updated in February, found that “sweeping allegations about noncitizen registrations or voting appear to arise from misunderstandings, mischaracterizations, or outright fabrications about complex voter data. In every examined case, when claims about large numbers of noncitizens on voting rolls are subject to scrutiny and properly investigated, the number of alleged instances falls drastically.”</p>



<h2 class="wp-block-heading"><strong>What do we know about the DHS citizenship verification system?</strong></h2>



<p>Numerous states recently have used a Department of Homeland Security program called the Systematic Alien Verification for Entitlements, or SAVE, to check the citizenship status of people on their voter rolls &#8212; something that the SAVE America Act would require. The bill says that states should use the system &#8220;for the purposes of identifying individuals who are not citizens of the United States and taking the necessary steps to remove such individuals who are not citizens from the official list, after notice is given to such individuals and such individuals are given the opportunity to provide documentary proof of United States citizenship.&#8221; The legislation doesn&#8217;t provide more information on how these notices and opportunities to fix a mistake would be carried out.  </p>



<p>Recent reporting shows the SAVE database has flaws. </p>



<p>According to a <a href="https://www.nytimes.com/2026/01/14/us/politics/noncitizen-voters-save-tool.html" target="_blank" rel="noreferrer noopener">January New York Times article</a>, 49.5 million voter registrations have been checked in several states, and the Department of Homeland Security referred about .02%, or 10,000 cases, to investigators. The Times found that when some counties began looking into the cases, it turned out that only a fraction of them were potentially noncitizens. There was no indication of how many of those who may have improperly registered to vote actually voted.</p>



<p>Texas, too, found there were errors in DHS&#8217; SAVE database. In October, the state <a href="https://www.sos.state.tx.us/about/newsreleases/2025/102025.shtml">s</a><a href="https://www.sos.state.tx.us/about/newsreleases/2025/102025.shtml" target="_blank" rel="noreferrer noopener">aid</a> the database identified 2,724 potential noncitizens in its voter rolls of more than 18 million people, and it referred the cases to Texas counties. Many of those counties found U.S. citizens were among those flagged.</p>



<p>In February, ProPublica and the Texas Tribune <a href="https://www.texastribune.org/2026/02/13/save-voter-citizenship-tool-mistakes-confusion/" target="_blank" rel="noreferrer noopener">wrote</a> that their examination of the SAVE system &#8220;reveals that DHS rushed the revamped tool into use while it was still adding data and before it could discern voters’ most up-to-date citizenship information.</p>



<p>&#8220;As a result, SAVE has made persistent mistakes, particularly in assessing the status of people born outside the U.S., data gathered from local election administrators, interviews and emails obtained via public records requests show. Some of those people subsequently become U.S. citizens, a step that the system doesn’t always pick up,&#8221; the news organizations wrote. </p>



<h2 class="wp-block-heading"><strong>Are a majority of voters in favor of the SAVE Act or the SAVE America Act?</strong></h2>



<p>Yes,&nbsp;<a href="https://harvardharrispoll.com/wp-content/uploads/2026/03/HHP_Feb2026_KeyResults_Mon.pdf" target="_blank" rel="noreferrer noopener">according to</a>&nbsp;a February Harvard CAPS/Harris poll, which found that 71% of the registered voters surveyed said that they supported the SAVE America Act, including 91% of Republicans, 69% of independents and 50% of Democrats.</p>



<p>The online poll conducted Feb. 25-26&nbsp;<a href="https://harvardharrispoll.com/wp-content/uploads/2026/03/HHP_Feb2026_Topline.pdf#page=221&amp;zoom=130,-5,35" target="_blank" rel="noreferrer noopener">asked</a>&nbsp;1,999 registered voters, “Do you support or oppose the proposed SAVE America Act that would: Require proof of citizenship to register to vote, Require voter ID, Require states to remove non-citizens from their voting rolls, Require states to share unredacted voting rolls with the Department of Homeland Security.”</p>



<p>Three out of the four proposals mentioned in that description of the bill appealed to an even larger group. A&nbsp;<a href="https://perma.cc/R4EJ-4GDY" target="_blank" rel="noreferrer noopener">press release</a>&nbsp;about the results of the Harvard CAPS/Harris poll said, “The majority of voters support specific requirements of the Act, including proof of citizenship (75%), voter ID (81%), states removing non-citizens from voter rolls (80%), and states sharing redacted voting rolls with the Department of Homeland Security (61%).”</p>



<p>Past polls have revealed similar levels of support for some of those policies.</p>



<p>A Pew Research Center poll from August&nbsp;<a href="https://www.pewresearch.org/wp-content/uploads/sites/20/2025/08/PP_2025.8.22_voting-policy_report.pdf#page=4&amp;zoom=auto,-265,71" target="_blank" rel="noreferrer noopener">found</a>&nbsp;that 83% of those asked were in favor of a requirement for everyone to show government-issued photo identification before voting,&nbsp;<a href="https://www.pewresearch.org/wp-content/uploads/sites/20/2025/08/PP_2025.8.22_voting-policy_report.pdf#page=9&amp;zoom=auto,-265,766" target="_blank" rel="noreferrer noopener">including</a>&nbsp;95% of Republicans and 71% of Democrats.&nbsp;</p>



<p>In addition, a Gallup poll from October 2024&nbsp;<a href="https://news.gallup.com/poll/652523/americans-endorse-early-voting-voter-verification.aspx" target="_blank" rel="noreferrer noopener">found</a>&nbsp;that 84% of surveyed adults supported “[r]equiring all voters to provide photo identification at their voting place in order to vote,” while 83% backed “[r]equiring people who are registering to vote for the first time to provide proof of citizenship.” About two-thirds of Democrats supported both ideas, more than 8-in-10 independents did, and nearly all Republicans were on board with each.</p>



<p>Becker, of the Center for Election Innovation &amp; Research, noted that the results of these surveys depend on what questions are asked. &#8220;If you just ask the regular question in polls, do you support voter ID, you do see vast majorities of Americans say yes, including majorities of Democrats. If you ask people, should eligible voters without voter IDs be disenfranchised, you get very different responses.&#8221;</p>



<p>The Harvard CAPS/Harris poll also asked, &#8220;Which of the following is more important?,&#8221; giving two choices. A little more than half, 54%, said, &#8220;That we do everything possible to stop voter fraud and illegal immigrants from voting,&#8221; and 46% said, &#8220;That eligible citizens aren&#8217;t denied the ability to vote.&#8221;</p>



<h2 class="wp-block-heading"><strong>What has Trump said about eliminating voting by mail?</strong></h2>



<p>Trump has proposed that the final version of the bill also eliminate mail-in voting with limited exceptions.</p>



<p>“We don’t want mail-in ballots,” Trump&nbsp;<a href="https://rollcall.com/factbase/trump/transcript/donald-trump-interview-tyler-madden-wkrc-cincinnati-march-11-2026/#12" target="_blank" rel="noreferrer noopener">said</a>&nbsp;while talking about his proposal during an interview with a Cincinnati&nbsp;news station on March 11. “We don’t want to have ballots coming from all different corners of the world. We want to have it accurate, and you can’t do that with mail-in ballots.”</p>



<p>In&nbsp;<a href="https://truthsocial.com/@realDonaldTrump/posts/116211737655789420" target="_blank" rel="noreferrer noopener">multiple</a>&nbsp;<a href="https://truthsocial.com/@realDonaldTrump/posts/116178624373752275" target="_blank" rel="noreferrer noopener">posts</a>&nbsp;<a href="https://truthsocial.com/@realDonaldTrump/posts/116200253375013431" target="_blank" rel="noreferrer noopener">on social media</a>&nbsp;in March, the president has written, “NO MAIL-IN BALLOTS (EXCEPT FOR ILLNESS, DISABILITY, MILITARY, OR TRAVEL!).”</p>



<p>As is, the House-passed bill would not abolish mail-in voting, but it would require identification to both request and submit a mail-in ballot.</p>



<p>As we’ve&nbsp;<a href="https://www.factcheck.org/2026/02/trump-and-musk-amplify-long-ago-debunked-mail-in-vote-fraud-claim/" target="_blank" rel="noreferrer noopener">reported</a>, mail-in voting is used widely throughout the U.S. Eight states and Washington, D.C., conduct their elections mostly by mail,&nbsp;<a href="https://www.ncsl.org/elections-and-campaigns/table-18-states-with-all-mail-elections" target="_blank" rel="noreferrer noopener">according to</a>&nbsp;the National Conference of State Legislatures. In addition, 28 states&nbsp;<a href="https://www.ncsl.org/elections-and-campaigns/table-1-states-with-no-excuse-absentee-voting" target="_blank" rel="noreferrer noopener">allow</a>&nbsp;“no excuse” mail-in voting, which means that voters don’t need to provide a reason when requesting a mail-in ballot.</p>



<p>In the August Pew Research Center poll, 58% of respondents <a href="https://www.pewresearch.org/politics/2025/08/22/majority-of-americans-continue-to-back-expanded-early-voting-voting-by-mail-voter-id/" target="_blank" rel="noreferrer noopener">said</a> they supported allowing any voter to vote by mail. </p>



<p>Elections experts&nbsp;<a href="https://www.factcheck.org/2025/08/factchecking-trumps-claims-about-mail-in-ballots-voting-machines-and-states-role/" target="_blank" rel="noreferrer noopener">have</a>&nbsp;<a href="https://www.factcheck.org/2020/04/trumps-latest-voter-fraud-misinformation/" target="_blank" rel="noreferrer noopener">told us</a>&nbsp;for years that while fraud is slightly more prevalent with mail-in voting than in-person voting, it is still relatively rare and not widespread.</p>



<h2 class="wp-block-heading"><strong>What else does Trump want in the bill?</strong></h2>



<p>More recently, Trump has said that he wants the legislation to address two non-election-related issues.</p>



<p>“I added on no men playing in women’s sports, and I added in no transgender surgery, the mutilation of our children,” Trump&nbsp;<a href="https://rollcall.com/factbase/trump/transcript/donald-trump-remarks-fraud-task-force-executive-order-march-16-2026/#157" target="_blank" rel="noreferrer noopener">said</a>&nbsp;from the Oval Office on March 16, referring to his proposed ban on transgender women playing in women’s athletics and gender-affirming surgery for minors.</p>



<p>Those are the last two of Trump’s&nbsp;<a href="https://truthsocial.com/@realDonaldTrump/posts/116200253375013431" target="_blank" rel="noreferrer noopener">five-point plan</a>&nbsp;for the bill, and Republican Sen. Eric Schmitt of Missouri <a href="https://www.congress.gov/amendment/119th-congress/senate-amendment/4420/text" target="_blank" rel="noreferrer noopener">has introduced</a> an amendment to include all five parts in the final legislation.</p>



<p>“I’ve worked closely with President Trump and the White House to introduce a substitute amendment that will save our elections, save women’s sports, and save our children from gender mutilation surgeries. It’s time to get this done,” Schmitt said in a&nbsp;<a href="https://perma.cc/NYS2-GBJW" target="_blank" rel="noreferrer noopener">March 17 statement</a>.</p>



<p>In all, Schmitt said his amendment would: “Require all voters to show ID,” “Require proof of citizenship to vote,” “End mail-in balloting with exceptions for military, illness, travel, and disability,” “Keep men out of women’s sports,” and “Protect children from transgender mutilation surgeries.”</p>



<p><em>Robert Farley contributed to this article. </em></p>



<p><em>Clarification, March 20: We made clear that the REAL ID &#8220;enhanced&#8221; driver&#8217;s licenses available in five states indicate citizenship.  </em></p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<p><em>Editor’s note: FactCheck.org does not accept advertising. We rely on grants and individual donations from people like you. Please consider a donation. Credit card donations may be made through <a href="https://giving.aws.cloud.upenn.edu/?fastStart=simpleForm&amp;program=ANS&amp;fund=602014" target="_blank" rel="noreferrer noopener">our “Donate” page</a>. If you prefer to give by check, send to: FactCheck.org, Annenberg Public Policy Center, P.O. Box 58100, Philadelphia, PA 19102. </em></p>
<p>The post <a href="https://www.factcheck.org/2026/03/qa-on-the-save-america-act/">Q&amp;A on the SAVE America Act</a> appeared first on <a href="https://www.factcheck.org">FactCheck.org</a>.</p>
]]></content:encoded>
					
		
		
			</item>
	</channel>
</rss>

<!--
Performance optimized by W3 Total Cache. Learn more: https://www.boldgrid.com/w3-total-cache/


Served from: www.factcheck.org @ 2026-04-10 19:41:14 by W3 Total Cache
-->
          `)
        )
        expect(rows).toStrictEqual([])
      })
  )
})
