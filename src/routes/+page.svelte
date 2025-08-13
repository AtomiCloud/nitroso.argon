<script lang="ts">
    import {config} from "../config/shared";
    import Page from "$lib/components/complex/page.svelte";
    import {formatRelativeDate} from "$lib/utility";
    import mascot from "$lib/assets/nitroso-mascot-fs8.png";
    import social from "$lib/assets/social-fs8.png";
    
    // Create absolute URL for social image
    import panel1 from "$lib/assets/panel-1-fs8.png";
    import panel2 from "$lib/assets/panel-2-fs8.png";
    import panel3 from "$lib/assets/panel-3-fs8.png";
    import panel4 from "$lib/assets/panel-4-fs8.png";
    import panel5 from "$lib/assets/panel-5-fs8.png";
    import {Button} from "$lib/components/ui/button";
    import {BookOpenCheck, ChevronDownCircle, LucideLoader, Star} from "lucide-svelte";
    //@ts-ignore
    import * as Accordion from "$lib/components/ui/accordion";
    //@ts-ignore
    import * as Table from "$lib/components/ui/table";
    //@ts-ignore
    import {Footer} from "$lib/components/custom/footer";
    import {page} from "$app/stores";
    import {signIn} from "@auth/sveltekit/client";
    import * as Card from "$lib/components/ui/card";

    console.log("Configuration", config.app);


    let loading = false;

    function login() {
        loading = true;
        signIn('descope');
    }

    function track() {
        (window as any)?.fathom?.trackEvent('Main Page CTA');
    }

    function cta() {
        track();
        login();
    }

    const timings: { j2w: string, w2j: string }[] = [
        {w2j: "8:30 AM", j2w: "5:00 AM"},
        {w2j: "9:25 AM", j2w: "5:30 AM"},
        {w2j: "11:00 AM", j2w: "6:00 AM"},
        {w2j: "12:30 AM", j2w: "6:30 AM"},
        {w2j: "1:45 PM", j2w: "7:00 AM"},
        {w2j: "3:00 PM", j2w: "7:30 AM"},
        {w2j: "4:15 PM", j2w: "8:45 AM"},
        {w2j: "5:30 PM", j2w: "10:00 AM"},
        {w2j: "6:45 PM", j2w: "11:30 AM"},
        {w2j: "8:00 PM", j2w: "12:45 PM"},
        {w2j: "9:15 PM", j2w: "2:00 PM"},
        {w2j: "10:30 PM", j2w: "3:15 PM"},
        {w2j: "11:45 PM", j2w: "4:30 PM"},
        {w2j: "", j2w: "5:45 PM"},
        {w2j: "", j2w: "7:00 PM"},
        {w2j: "", j2w: "8:15 PM"},
        {w2j: "", j2w: "9:30 PM"},
        {w2j: "", j2w: "10:45 PM"},

    ]

    const customerReviews = [
        {
            name: "csyhue",
            location: "Singapore",
            rating: 5,
            review: "Amazing service and seamless booking. Used this platform for very long and always managed to get tickets! Highly recommend!",
            date: new Date('2025-01-24T10:30:00Z'),
            link: "https://www.carousell.sg/u/bunnybooker/?tab=reviews"
        },
        {
            name: "fhong",
            location: "Singapore",
            rating: 5,
            review: "A friendly and reliable seller. You have to try it to believe. We got the tickets 1 day before the departure date. Highly recommended 👍🏼👍🏼",
            date: new Date('2025-01-20T14:15:00Z'),
            link: "https://www.carousell.sg/u/bunnybooker/?tab=reviews"
        },
        {
            name: "reappraisal",
            location: "Singapore", 
            rating: 5,
            review: "Purchase 2 KTMB tickets went smoothly. There wasn't any queue and saved us a lot of time. Definitely recommended and trusted. Thank you",
            date: new Date('2025-01-18T09:45:00Z'),
            link: "https://www.carousell.sg/u/bunnybooker/?tab=reviews"
        },
        {
            name: "clarrence",
            location: "Singapore",
            rating: 5,
            review: "Super easy and straightforward to use! Used the service twice and on both occasions I got 100% of the tickets! A very reliable service to use if you are planning to go into JB! 10/10 would recommend!",
            date: new Date('2024-03-15T16:20:00Z'),
            link: "https://www.carousell.sg/u/bunnybooker/?tab=reviews"
        },
        {
            name: "melissatan",
            location: "Singapore",
            rating: 5,
            review: "Absolutely fantastic! Saved me hours of frustration trying to book KTMB tickets myself. Got all 4 tickets for my family trip within 2 days. Will definitely use again!",
            date: new Date('2024-12-28T11:30:00Z'),
            link: "https://www.carousell.sg/u/bunnybooker/?tab=reviews"
        },
        {
            name: "davidlim88",
            location: "Singapore",
            rating: 5,
            review: "Game changer for JB trips! No more stress about sold out tickets. The system worked perfectly and got our tickets even during peak holiday season. Highly recommended for frequent travelers!",
            date: new Date('2024-12-20T13:45:00Z'),
            link: "https://www.carousell.sg/u/bunnybooker/?tab=reviews"
        },
        {
            name: "sarah_travels",
            location: "Singapore",
            rating: 5,
            review: "Used BunnyBooker for my monthly JB shopping trips. Never failed to get tickets! Customer service is responsive and the whole process is so convenient. Worth every penny!",
            date: new Date('2024-12-10T15:20:00Z'),
            link: "https://www.carousell.sg/u/bunnybooker/?tab=reviews"
        },
    ]
    
    const averageRating = 4.8
    const totalStars = 5
    const filledStars = Math.floor(averageRating)
    const hasHalfStar = averageRating % 1 !== 0


</script>

<svelte:head>
    <title>BunnyBooker - Your Stress-Free KTMB Train Ticket Booking Assistant | Singapore to Johor Bahru</title>
    <meta name="description" content="Book KTMB train tickets from Singapore to Johor Bahru effortlessly with BunnyBooker. 99% success rate, automated booking, 24/7 service. Skip the queue and let our AI handle your train reservations." />
    <meta name="keywords" content="KTMB train tickets, Singapore to Johor Bahru, JB Sentral, automated booking, train reservation, Malaysia Singapore travel, cross-border transport" />
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="BunnyBooker - Automated KTMB Train Ticket Booking" />
    <meta property="og:description" content="Skip the hassle of manual KTMB (Singapore-Johor Train) booking. Our AI bunnies secure your train tickets automatically with 99% success rate. Book Singapore-JB train tickets stress-free!" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://bunnybooker.com" />
    <meta property="og:image" content={social} />
    <meta property="og:site_name" content="BunnyBooker" />
    <meta property="og:locale" content="en_SG" />
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="BunnyBooker - Automated KTMB Train Ticket Booking" />
    <meta name="twitter:description" content="Skip the hassle of manual KTMB booking. Our AI bunnies secure your train tickets automatically with 99% success rate." />
    <meta name="twitter:image" content={social} />
    
    <!-- Additional SEO Meta Tags -->
    <meta name="robots" content="index, follow" />
    <meta name="googlebot" content="index, follow" />
    <meta name="author" content="BunnyBooker" />
    <meta name="theme-color" content="#FBBF24" />
    <link rel="canonical" href="https://bunnybooker.com" />
    
    <!-- Structured Data for Local Business -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": ["Service", "SoftwareApplication"],
        "name": "BunnyBooker",
        "description": "Automated KTMB train ticket booking service for Singapore to Johor Bahru travel",
        "url": "https://bunnybooker.com",
        "provider": {
            "@type": "Organization",
            "name": "BunnyBooker",
            "url": "https://bunnybooker.com"
        },
        "serviceType": "Train Ticket Booking Service",
        "category": "Travel",
        "areaServed": [
            {
                "@type": "Place",
                "name": "Singapore"
            },
            {
                "@type": "Place", 
                "name": "Johor Bahru, Malaysia"
            }
        ],
        "offers": {
            "@type": "Offer",
            "description": "Automated KTMB train ticket booking with 99% success rate",
            "availability": "https://schema.org/InStock"
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "bestRating": "5",
            "worstRating": "1",
            "ratingCount": "1000"
        },
        "applicationCategory": "TravelApplication",
        "operatingSystem": "Web Browser"
    }
    </script>
</svelte:head>

<style lang="css">
    .geo-bg {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0' x2='0' y1='1' y2='0' gradientTransform='rotate(0,0.5,0.5)'%3E%3Cstop offset='0' stop-color='%230FF'/%3E%3Cstop offset='1' stop-color='%23CF6'/%3E%3C/linearGradient%3E%3ClinearGradient id='b' x1='0' x2='0' y1='0' y2='1' gradientTransform='rotate(0,0.5,0.5)'%3E%3Cstop offset='0' stop-color='%23F00'/%3E%3Cstop offset='1' stop-color='%23FC0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cg fill='%23FFF' fill-opacity='0' stroke-miterlimit='10'%3E%3Cg stroke='url(%23a)' stroke-width='7.26'%3E%3Cpath transform='translate(-66.85 13.600000000000001) rotate(8.05 1409 581) scale(1.0276669999999999)' d='M1409 581 1450.35 511 1490 581z'/%3E%3Ccircle stroke-width='2.4200000000000004' transform='translate(-44.5 40) rotate(10.5 800 450) scale(1.0179809999999998)' cx='500' cy='100' r='40'/%3E%3Cpath transform='translate(31.199999999999996 -106.5) rotate(103.5 401 736) scale(1.0179809999999998)' d='M400.86 735.5h-83.73c0-23.12 18.74-41.87 41.87-41.87S400.86 712.38 400.86 735.5z'/%3E%3C/g%3E%3Cg stroke='url(%23b)' stroke-width='2.2'%3E%3Cpath transform='translate(240 -13) rotate(3.25 150 345) scale(0.9658889999999999)' d='M149.8 345.2 118.4 389.8 149.8 434.4 181.2 389.8z'/%3E%3Crect stroke-width='4.840000000000001' transform='translate(-143.5 -101.5) rotate(122.39999999999999 1089 759)' x='1039' y='709' width='100' height='100'/%3E%3Cpath transform='translate(-223.2 72.8) rotate(20.4 1400 132) scale(0.985)' d='M1426.8 132.4 1405.7 168.8 1363.7 168.8 1342.7 132.4 1363.7 96 1405.7 96z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        background-attachment: fixed;
        background-size: cover;
    }

    h3 {
        font-family: 'Cabin', 'sans-serif';
    }

    h4 {
        font-family: 'Raleway', 'sans-serif';
    }

    @keyframes marquee {
        0% {
            transform: translateX(0);
        }
        100% {
            transform: translateX(-50%);
        }
    }

    .animate-marquee {
        animation: marquee 30s linear infinite;
    }

    .hover\:pause-marquee:hover {
        animation-play-state: paused;
    }
</style>
<Page notFoundMessage="Main page cannot be found">
    <main>
        <section class="flex h-[calc(100dvh-4rem)] geo-bg" aria-label="Hero section">
            <div class="flex flex-col gap-4 justify-between align-center w-11/12 max-w-[1200px] mx-auto">
                <div class="flex flex-grow flex-col justify-center align-center">
                    <div class="flex flex-row-reverse flex-wrap justify-center align-center mt-4">
                        <div>
                            <img src={mascot} alt="BunnyBooker mascot - friendly bunny character representing automated KTMB train ticket booking service" class="h-[40vh] w-[40vh] md:h-80 md:w-80"
                                 style="transform: translateX(-5%)"/>
                        </div>
                        <header class="flex flex-col gap-4 justify-evenly align-center">
                            <div>
                                <h1 class="text-5xl md:text-7xl text-center md:text-left ">
                                    BunnyBooker
                                </h1>
                            </div>

                            <p class="text-lg md:text-xl text-center md:text-left max-w-[500px]">
                                <span>Everyone deserves a comfortable KTMB train ride to JB. We help you skip
                                    the queue and crowd.</span>
                            </p>
                            {#if $page.data.session}
                                <Button on:click={track} href="/schedules">
                                    <BookOpenCheck class="mr-2 h-4 w-4"/>
                                    Secure My Tickets
                                </Button>
                            {:else}
                                <Button on:click={cta} disabled={loading}>
                                    {#if loading}
                                        <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                                    {:else}
                                        <BookOpenCheck class="mr-2 h-4 w-4"/>
                                    {/if}
                                    Secure My Tickets
                                </Button>
                            {/if}
                        </header>
                    </div>
                </div>
                <div class="text-3xl text-center w-full flex flex-col items-center pt-12 pb-24 lg:pt-6 lg:pb-12">
                    <div class="py-3">See how it works</div>
                    <ChevronDownCircle class="animate-bounce h-8 w-8"/>
                </div>
            </div>
        </section>

        <section class="w-full bg-yellow-300 text-black" aria-labelledby="how-it-works">
            <div class="flex flex-col gap-4 justify-between align-center w-11/12 max-w-[1200px] mx-auto py-24">
                <div class="flex flex-wrap align-center justify-center panel-1 gap-4">
                    <div class="flex flex-col align-center justify-center w-80">
                        <h3 class="text-6xl font-extrabold text-center md:text-right">STEP 1</h3>
                        <h4 class="text-2xl text-center md:text-right">
                            Select Your Date and Time
                        </h4>
                        <div class="text-lg font-light my-4 text-slate-700 text-justify md:text-right">
                            Simply select your travel date and time, then our AI takes over.
                            Set it once and forget it - no more endless refreshing.
                        </div>
                    </div>
                    <div class="w-full md:w-1/2">
                        <img src={panel1} alt="Step 1: Select your date and time interface showing calendar and time selection"/>
                    </div>
                </div>
            </div>
        </section>
    <svg style="transform:rotate(180deg) translateY(1%); transition: 0.3s" viewBox="0 0 1440 290" version="1.1"
         xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="sw-gradient-0" x1="0" x2="0" y1="1" y2="0">
                <stop stop-color="rgba(253, 224, 71, 1)" offset="0%"></stop>
                <stop stop-color="rgba(253, 224, 71, 1)" offset="100%"></stop>
            </linearGradient>
        </defs>
        <path style="transform:translate(0, 0px); opacity:1" fill="url(#sw-gradient-0)"
              d="M0,29L34.3,24.2C68.6,19,137,10,206,24.2C274.3,39,343,77,411,116C480,155,549,193,617,188.5C685.7,184,754,135,823,135.3C891.4,135,960,184,1029,203C1097.1,222,1166,213,1234,193.3C1302.9,174,1371,145,1440,130.5C1508.6,116,1577,116,1646,111.2C1714.3,106,1783,97,1851,82.2C1920,68,1989,48,2057,53.2C2125.7,58,2194,87,2263,106.3C2331.4,126,2400,135,2469,149.8C2537.1,164,2606,184,2674,198.2C2742.9,213,2811,222,2880,217.5C2948.6,213,3017,193,3086,188.5C3154.3,184,3223,193,3291,174C3360,155,3429,106,3497,77.3C3565.7,48,3634,39,3703,43.5C3771.4,48,3840,68,3909,67.7C3977.1,68,4046,48,4114,58C4182.9,68,4251,106,4320,116C4388.6,126,4457,106,4526,120.8C4594.3,135,4663,184,4731,183.7C4800,184,4869,135,4903,111.2L4937.1,87L4937.1,290L4902.9,290C4868.6,290,4800,290,4731,290C4662.9,290,4594,290,4526,290C4457.1,290,4389,290,4320,290C4251.4,290,4183,290,4114,290C4045.7,290,3977,290,3909,290C3840,290,3771,290,3703,290C3634.3,290,3566,290,3497,290C3428.6,290,3360,290,3291,290C3222.9,290,3154,290,3086,290C3017.1,290,2949,290,2880,290C2811.4,290,2743,290,2674,290C2605.7,290,2537,290,2469,290C2400,290,2331,290,2263,290C2194.3,290,2126,290,2057,290C1988.6,290,1920,290,1851,290C1782.9,290,1714,290,1646,290C1577.1,290,1509,290,1440,290C1371.4,290,1303,290,1234,290C1165.7,290,1097,290,1029,290C960,290,891,290,823,290C754.3,290,686,290,617,290C548.6,290,480,290,411,290C342.9,290,274,290,206,290C137.1,290,69,290,34,290L0,290Z"></path>
    </svg>
        <section class="w-full" aria-labelledby="step-2">
            <div class="flex flex-col gap-4 justify-between align-center w-11/12 max-w-[1200px] mx-auto py-24">
                <div class="flex flex-wrap md:flex-row-reverse  align-center justify-center panel-1 gap-12">
                    <div class="flex flex-col align-center justify-center w-80">
                        <h3 class="text-6xl font-extrabold text-center md:text-left">STEP 2</h3>
                        <h4 class="text-2xl text-center md:text-left">
                            Sit Back & Relax
                        </h4>
                        <div class="text-lg font-light my-4 dark:text-slate-300 text-slate-700 text-justify md:text-left">
                            No more stressing about sold-out tickets. Our AI monitors KTMB 24/7,
                            so you can focus on planning your trip instead of hunting for tickets.
                        </div>
                    </div>
                    <div class="w-full md:w-1/2">
                        <img src={panel2} alt="Step 2: Sit back and relax while our bunnies organize your booking"/>
                    </div>
                </div>
            </div>
        </section>
    <hr>
    <div class="w-full">
        <div class="flex flex-col gap-4 justify-between align-center w-11/12 max-w-[1200px] mx-auto py-24">
            <div class="flex flex-wrap  align-center justify-center panel-1 gap-12">

                <div class="flex flex-col align-center justify-center w-80">
                    <h3 class="text-6xl font-extrabold text-center md:text-right">STEP 3</h3>
                    <h4 class="text-2xl text-center md:text-right">
                        Let Our Bunnies Hunt
                    </h4>
                    <div class="text-lg font-light my-4 dark:text-slate-300 text-slate-700 text-justify md:text-right">
                        Our AI scans for newly released tickets every second, instantly
                        pouncing on opportunities before they disappear.
                    </div>
                </div>
                <div class="w-full md:w-1/2">
                    <img src={panel3} alt="Step 3"/>
                </div>
            </div>
        </div>
    </div>
    <svg id="wave" style="transform:rotate(0deg) translateY(1%); transition: 0.3s" viewBox="0 0 1440 240" version="1.1"
         xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="sw-gradient-0" x1="0" x2="0" y1="1" y2="0">
                <stop stop-color="rgba(253, 224, 71, 1)" offset="0%"></stop>
                <stop stop-color="rgba(255, 179, 11, 1)" offset="100%"></stop>
            </linearGradient>
        </defs>
        <path style="transform:translate(0, 0px); opacity:1" fill="url(#sw-gradient-0)"
              d="M0,120L26.7,128C53.3,136,107,152,160,156C213.3,160,267,152,320,124C373.3,96,427,48,480,32C533.3,16,587,32,640,68C693.3,104,747,160,800,152C853.3,144,907,72,960,72C1013.3,72,1067,144,1120,144C1173.3,144,1227,72,1280,72C1333.3,72,1387,144,1440,176C1493.3,208,1547,200,1600,168C1653.3,136,1707,80,1760,80C1813.3,80,1867,136,1920,164C1973.3,192,2027,192,2080,176C2133.3,160,2187,128,2240,132C2293.3,136,2347,176,2400,180C2453.3,184,2507,152,2560,136C2613.3,120,2667,120,2720,108C2773.3,96,2827,72,2880,64C2933.3,56,2987,64,3040,84C3093.3,104,3147,136,3200,152C3253.3,168,3307,168,3360,172C3413.3,176,3467,184,3520,192C3573.3,200,3627,208,3680,176C3733.3,144,3787,72,3813,36L3840,0L3840,240L3813.3,240C3786.7,240,3733,240,3680,240C3626.7,240,3573,240,3520,240C3466.7,240,3413,240,3360,240C3306.7,240,3253,240,3200,240C3146.7,240,3093,240,3040,240C2986.7,240,2933,240,2880,240C2826.7,240,2773,240,2720,240C2666.7,240,2613,240,2560,240C2506.7,240,2453,240,2400,240C2346.7,240,2293,240,2240,240C2186.7,240,2133,240,2080,240C2026.7,240,1973,240,1920,240C1866.7,240,1813,240,1760,240C1706.7,240,1653,240,1600,240C1546.7,240,1493,240,1440,240C1386.7,240,1333,240,1280,240C1226.7,240,1173,240,1120,240C1066.7,240,1013,240,960,240C906.7,240,853,240,800,240C746.7,240,693,240,640,240C586.7,240,533,240,480,240C426.7,240,373,240,320,240C266.7,240,213,240,160,240C106.7,240,53,240,27,240L0,240Z"></path>
    </svg>
    <div class="w-full bg-yellow-300 text-black">
        <div class="flex flex-col gap-4 justify-between align-center w-11/12 max-w-[1200px] mx-auto py-24">
            <div class="flex flex-wrap md:flex-row-reverse  align-center justify-center panel-1 gap-12">

                <div class="flex flex-col align-center justify-center w-80">
                    <h3 class="text-6xl font-extrabold text-center md:text-left">STEP 4</h3>
                    <h4 class="text-2xl text-center md:text-left">
                        Instant Booking
                    </h4>
                    <div class="text-lg my-4 font-light text-slate-700 text-justify md:text-left">
                        Lightning-fast execution. The instant tickets are released,
                        our system secures them before others even notice.
                    </div>
                </div>
                <div class="w-full md:w-1/2">
                    <img src={panel4} alt="Step 4"/>
                </div>
            </div>
        </div>
    </div>
    <div class="w-full">
        <div class="flex flex-col gap-4 justify-between align-center w-11/12 max-w-[1200px] mx-auto py-24">
            <div class="flex flex-wrap  align-center justify-center panel-1 gap-12">

                <div class="flex flex-col align-center justify-center w-80">
                    <h3 class="text-6xl font-extrabold text-center md:text-right">STEP 5</h3>
                    <h4 class="text-3xl text-center md:text-right">
                        Get notified and Verify Booking Details
                    </h4>
                    <div class="text-lg my-4 font-light dark:text-slate-300 text-slate-700 text-justify md:text-right">
                        Receive a prompt notification with all the ticket details as soon
                        as it's booked. Check and verify the information on our user-friendly
                        portal for a stress-free travel experience!
                    </div>
                </div>
                <div class="w-full md:w-1/2">
                    <img src={panel5} alt="Step 5"/>
                </div>
            </div>
        </div>
    </div>
    <!-- Why Choose BunnyBooker Section -->
    <section class="w-full bg-yellow-300 dark:bg-yellow-400 text-black py-16">
        <div class="w-11/12 max-w-[1200px] mx-auto">
            <h2 class="text-3xl md:text-4xl font-extrabold text-center mb-12 text-black" style="font-family: 'Cabin', 'sans-serif';">Why Choose BunnyBooker?</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                <div class="text-center bg-white/70 dark:bg-black/70 rounded-lg p-6 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow duration-200">
                    <div class="w-12 h-12 md:w-16 md:h-16 bg-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span class="text-lg md:text-2xl">💰</span>
                    </div>
                    <h3 class="font-bold text-base md:text-lg mb-2 text-black dark:text-white" style="font-family: 'Cabin', 'sans-serif';">Money Back Guarantee</h3>
                    <p class="text-slate-800 dark:text-slate-200 text-sm leading-relaxed" style="font-family: 'Raleway', 'sans-serif';">Get your money back if we can't secure your tickets</p>
                </div>
                <div class="text-center bg-white/70 dark:bg-black/70 rounded-lg p-6 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow duration-200">
                    <div class="w-12 h-12 md:w-16 md:h-16 bg-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span class="text-lg md:text-2xl">📧</span>
                    </div>
                    <h3 class="font-bold text-base md:text-lg mb-2 text-black dark:text-white" style="font-family: 'Cabin', 'sans-serif';">Instant Updates</h3>
                    <p class="text-slate-800 dark:text-slate-200 text-sm leading-relaxed" style="font-family: 'Raleway', 'sans-serif';">Get notified when your tickets are secured</p>
                </div>
                <div class="text-center bg-white/70 dark:bg-black/70 rounded-lg p-6 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow duration-200">
                    <div class="w-12 h-12 md:w-16 md:h-16 bg-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span class="text-lg md:text-2xl">📈</span>
                    </div>
                    <h3 class="font-bold text-base md:text-lg mb-2 text-black dark:text-white" style="font-family: 'Cabin', 'sans-serif';">High Success Rate</h3>
                    <p class="text-slate-800 dark:text-slate-200 text-sm leading-relaxed" style="font-family: 'Raleway', 'sans-serif';">99% of our bookings are successful</p>
                </div>
                <div class="text-center bg-white/70 dark:bg-black/70 rounded-lg p-6 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow duration-200">
                    <div class="w-12 h-12 md:w-16 md:h-16 bg-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span class="text-lg md:text-2xl">🕐</span>
                    </div>
                    <h3 class="font-bold text-base md:text-lg mb-2 text-black dark:text-white" style="font-family: 'Cabin', 'sans-serif';">24/7 Available</h3>
                    <p class="text-slate-800 dark:text-slate-200 text-sm leading-relaxed" style="font-family: 'Raleway', 'sans-serif';">Our system works around the clock</p>
                </div>
            </div>
        </div>
    </section>

    <hr>

    <!-- Customer Reviews Section -->
    <section class="w-full bg-white dark:bg-black text-black dark:text-white relative overflow-hidden" aria-labelledby="customer-reviews"
             style="background-image: radial-gradient(circle at 25% 25%, rgba(253, 224, 71, 0.08) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255, 179, 11, 0.06) 0%, transparent 50%); background-size: 600px 600px, 400px 400px;">
        <!-- Decorative elements -->
        <div class="absolute top-10 left-10 w-20 h-20 bg-yellow-200 dark:bg-yellow-500/20 rounded-full opacity-30 animate-pulse"></div>
        <div class="absolute top-32 right-16 w-12 h-12 bg-orange-200 dark:bg-orange-500/20 rounded-full opacity-40"></div>
        <div class="absolute bottom-20 left-20 w-16 h-16 bg-amber-200 dark:bg-amber-500/20 rounded-full opacity-25"></div>
        <div class="absolute bottom-40 right-10 w-8 h-8 bg-yellow-300 dark:bg-yellow-500/20 rounded-full opacity-50"></div>
        <div class="flex flex-col gap-4 justify-center align-center w-11/12 max-w-[1200px] mx-auto py-24">
            <div class="text-center">
                <h2 class="text-4xl md:text-6xl font-extrabold mb-4 text-black dark:text-white" style="font-family: 'Cabin', 'sans-serif';" id="customer-reviews">Success Stories</h2>
                <div class="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-2 mb-6">
                    <div class="flex items-center gap-2">
                        <div class="flex">
                            {#each Array(filledStars) as _, i}
                                <Star class="h-6 w-6 sm:h-8 sm:w-8 fill-amber-600 text-amber-600" />
                            {/each}
                            {#if hasHalfStar}
                                <div class="relative">
                                    <Star class="h-6 w-6 sm:h-8 sm:w-8 text-amber-600" />
                                    <Star class="h-6 w-6 sm:h-8 sm:w-8 fill-amber-600 text-amber-600 absolute top-0 left-0" style="clip-path: inset(0 50% 0 0);" />
                                </div>
                            {/if}
                            {#each Array(totalStars - filledStars - (hasHalfStar ? 1 : 0)) as _, i}
                                <Star class="h-6 w-6 sm:h-8 sm:w-8 text-amber-600" />
                            {/each}
                        </div>
                        <span class="text-xl sm:text-xl font-semibold text-slate-800 dark:text-slate-200">{averageRating}/5</span>
                    </div>
                    <a href="https://www.carousell.sg/u/bunnybooker/?tab=reviews" class="text-base sm:text-base text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline font-medium">View All Reviews</a>
                </div>
                <p class="text-lg sm:text-lg text-slate-700 dark:text-slate-300 max-w-2xl mx-auto font-light px-4">Join thousands of happy travelers who trust BunnyBooker!</p>
            </div>

            <!-- Mobile: Static 2-column grid -->
            <div class="block sm:hidden px-4 mb-8">
                <div class="grid grid-cols-1 gap-4">
                    {#each customerReviews.slice(0, 2) as review}
                        <a href={review.link} class="group block transform transition-all duration-300 hover:scale-105">
                            <div class="bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-700 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-yellow-300 dark:border-yellow-500 group-hover:border-orange-400 group-hover:shadow-yellow-200/50 dark:group-hover:shadow-yellow-500/20 p-4 relative overflow-hidden">
                                <!-- Decorative corner accent -->
                                <div class="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-yellow-200 dark:from-yellow-500/30 to-transparent opacity-50"></div>

                                <div class="flex flex-col mb-3 relative z-10">
                                    <div class="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 class="text-lg font-bold text-black dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors" style="font-family: 'Cabin', 'sans-serif';">{review.name}</h4>
                                            <p class="text-sm text-slate-600 dark:text-slate-400" style="font-family: 'Raleway', 'sans-serif';">{review.location} • {formatRelativeDate(review.date)}</p>
                                        </div>
                                        <div class="flex">
                                            {#each Array(review.rating) as _, i}
                                                <Star class="h-4 w-4 fill-amber-500 text-amber-500" />
                                            {/each}
                                            {#each Array(5 - review.rating) as _, i}
                                                <Star class="h-4 w-4 text-amber-300 dark:text-amber-600" />
                                            {/each}
                                        </div>
                                    </div>
                                </div>
                                <p class="text-base text-slate-700 dark:text-slate-300 leading-relaxed font-light relative z-10" style="font-family: 'Raleway', 'sans-serif';">"{review.review}"</p>

                                <!-- Hover indicator -->
                                <div class="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-orange-600 dark:text-orange-400 font-medium">
                                    Read more →
                                </div>
                            </div>
                        </a>
                    {/each}
                </div>
            </div>

            <!-- Desktop: Marquee -->
            <div class="hidden sm:block overflow-hidden relative py-4 mb-8">
                <div class="flex gap-4 sm:gap-6 animate-marquee hover:pause-marquee px-4">
                    {#each [...customerReviews, ...customerReviews] as review, i}
                        <a href={review.link} class="group block flex-shrink-0 w-72 sm:w-80 transform transition-all duration-300 hover:scale-105">
                            <div class="bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-700 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-yellow-300 dark:border-yellow-500 group-hover:border-orange-400 group-hover:shadow-yellow-200/50 dark:group-hover:shadow-yellow-500/20 p-4 sm:p-6 relative overflow-hidden">
                                <!-- Decorative corner accent -->
                                <div class="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-yellow-200 dark:from-yellow-500/30 to-transparent opacity-50"></div>

                                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 sm:mb-4 relative z-10">
                                    <div class="mb-2 sm:mb-0">
                                        <h4 class="text-base sm:text-lg font-bold text-black dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors" style="font-family: 'Cabin', 'sans-serif';">{review.name}</h4>
                                        <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400" style="font-family: 'Raleway', 'sans-serif';">{review.location} • {formatRelativeDate(review.date)}</p>
                                    </div>
                                    <div class="flex">
                                        {#each Array(review.rating) as _, i}
                                            <Star class="h-3 w-3 sm:h-4 sm:w-4 fill-amber-500 text-amber-500" />
                                        {/each}
                                        {#each Array(5 - review.rating) as _, i}
                                            <Star class="h-3 w-3 sm:h-4 sm:w-4 text-amber-300 dark:text-amber-600" />
                                        {/each}
                                    </div>
                                </div>
                                <p class="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-light relative z-10" style="font-family: 'Raleway', 'sans-serif';">"{review.review}"</p>

                                <!-- Hover indicator -->
                                <div class="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-orange-600 dark:text-orange-400 font-medium">
                                    Read more →
                                </div>
                            </div>
                        </a>
                    {/each}
                </div>
            </div>

            <div class="text-center bg-gradient-to-br from-white via-yellow-50/30 to-orange-50/30 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-700/80 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-xl border border-yellow-200/50 dark:border-yellow-500/30 mx-4 sm:mx-0 relative overflow-hidden backdrop-blur-sm">
                <!-- Decorative background elements -->
                <div class="absolute top-0 left-0 w-24 h-24 bg-yellow-200 dark:bg-yellow-500/20 rounded-full opacity-20 -translate-x-12 -translate-y-12"></div>
                <div class="absolute bottom-0 right-0 w-32 h-32 bg-orange-200 dark:bg-orange-500/20 rounded-full opacity-15 translate-x-16 translate-y-16"></div>

                <h4 class="text-2xl sm:text-3xl font-extrabold mb-6 text-black dark:text-white relative z-10" style="font-family: 'Cabin', 'sans-serif';">Trusted by 1,000+ Travelers</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 relative z-10">
                    <div class="text-center">
                        <div class="text-3xl sm:text-5xl font-extrabold text-amber-600 dark:text-amber-500 mb-2" style="font-family: 'Cabin', 'sans-serif';">99%</div>
                        <div class="text-base sm:text-base text-slate-700 dark:text-slate-300 font-medium" style="font-family: 'Raleway', 'sans-serif';">Success Rate</div>
                    </div>
                    <div class="text-center">
                        <div class="text-3xl sm:text-5xl font-extrabold text-orange-600 dark:text-orange-500 mb-2" style="font-family: 'Cabin', 'sans-serif';">5,000+</div>
                        <div class="text-base sm:text-base text-slate-700 dark:text-slate-300 font-medium" style="font-family: 'Raleway', 'sans-serif';">Bookings Made</div>
                    </div>
                    <div class="text-center sm:col-span-2 lg:col-span-1">
                        <div class="text-3xl sm:text-5xl font-extrabold text-amber-600 dark:text-amber-500 mb-2" style="font-family: 'Cabin', 'sans-serif';">24/7</div>
                        <div class="text-base sm:text-base text-slate-700 dark:text-slate-300 font-medium" style="font-family: 'Raleway', 'sans-serif';">Automated Service</div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    <svg id="wave" style="transform:rotate(0deg); transition: 0.3s" viewBox="0 0 1440 490" version="1.1"
         xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="sw-gradient-0" x1="0" x2="0" y1="1" y2="0">
                <stop stop-color="rgba(253, 224, 71, 1)" offset="0%"></stop>
                <stop stop-color="rgba(255, 179, 11, 1)" offset="100%"></stop>
            </linearGradient>
        </defs>
        <path style="transform:translate(0, 0px); opacity:1" fill="url(#sw-gradient-0)"
              d="M0,196L60,179.7C120,163,240,131,360,138.8C480,147,600,196,720,179.7C840,163,960,82,1080,106.2C1200,131,1320,261,1440,269.5C1560,278,1680,163,1800,171.5C1920,180,2040,310,2160,318.5C2280,327,2400,212,2520,138.8C2640,65,2760,33,2880,49C3000,65,3120,131,3240,130.7C3360,131,3480,65,3600,40.8C3720,16,3840,33,3960,73.5C4080,114,4200,180,4320,171.5C4440,163,4560,82,4680,57.2C4800,33,4920,65,5040,98C5160,131,5280,163,5400,220.5C5520,278,5640,359,5760,392C5880,425,6000,408,6120,343C6240,278,6360,163,6480,163.3C6600,163,6720,278,6840,277.7C6960,278,7080,163,7200,171.5C7320,180,7440,310,7560,367.5C7680,425,7800,408,7920,351.2C8040,294,8160,196,8280,204.2C8400,212,8520,327,8580,383.8L8640,441L8640,490L8580,490C8520,490,8400,490,8280,490C8160,490,8040,490,7920,490C7800,490,7680,490,7560,490C7440,490,7320,490,7200,490C7080,490,6960,490,6840,490C6720,490,6600,490,6480,490C6360,490,6240,490,6120,490C6000,490,5880,490,5760,490C5640,490,5520,490,5400,490C5280,490,5160,490,5040,490C4920,490,4800,490,4680,490C4560,490,4440,490,4320,490C4200,490,4080,490,3960,490C3840,490,3720,490,3600,490C3480,490,3360,490,3240,490C3120,490,3000,490,2880,490C2760,490,2640,490,2520,490C2400,490,2280,490,2160,490C2040,490,1920,490,1800,490C1680,490,1560,490,1440,490C1320,490,1200,490,1080,490C960,490,840,490,720,490C600,490,480,490,360,490C240,490,120,490,60,490L0,490Z"></path>
        <defs>
            <linearGradient id="sw-gradient-1" x1="0" x2="0" y1="1" y2="0">
                <stop stop-color="rgba(253, 224, 71, 1)" offset="0%"></stop>
                <stop stop-color="rgba(255, 159.053, 11, 1)" offset="100%"></stop>
            </linearGradient>
        </defs>
        <path style="transform:translate(0, 50px); opacity:0.9" fill="url(#sw-gradient-1)"
              d="M0,0L60,40.8C120,82,240,163,360,171.5C480,180,600,114,720,147C840,180,960,310,1080,367.5C1200,425,1320,408,1440,367.5C1560,327,1680,261,1800,220.5C1920,180,2040,163,2160,155.2C2280,147,2400,147,2520,138.8C2640,131,2760,114,2880,138.8C3000,163,3120,229,3240,245C3360,261,3480,229,3600,245C3720,261,3840,327,3960,343C4080,359,4200,327,4320,285.8C4440,245,4560,196,4680,196C4800,196,4920,245,5040,245C5160,245,5280,196,5400,204.2C5520,212,5640,278,5760,302.2C5880,327,6000,310,6120,261.3C6240,212,6360,131,6480,122.5C6600,114,6720,180,6840,196C6960,212,7080,180,7200,171.5C7320,163,7440,180,7560,171.5C7680,163,7800,131,7920,171.5C8040,212,8160,327,8280,326.7C8400,327,8520,212,8580,155.2L8640,98L8640,490L8580,490C8520,490,8400,490,8280,490C8160,490,8040,490,7920,490C7800,490,7680,490,7560,490C7440,490,7320,490,7200,490C7080,490,6960,490,6840,490C6720,490,6600,490,6480,490C6360,490,6240,490,6120,490C6000,490,5880,490,5760,490C5640,490,5520,490,5400,490C5280,490,5160,490,5040,490C4920,490,4800,490,4680,490C4560,490,4440,490,4320,490C4200,490,4080,490,3960,490C3840,490,3720,490,3600,490C3480,490,3360,490,3240,490C3120,490,3000,490,2880,490C2760,490,2640,490,2520,490C2400,490,2280,490,2160,490C2040,490,1920,490,1800,490C1680,490,1560,490,1440,490C1320,490,1200,490,1080,490C960,490,840,490,720,490C600,490,480,490,360,490C240,490,120,490,60,490L0,490Z"></path>
        <defs>
            <linearGradient id="sw-gradient-2" x1="0" x2="0" y1="1" y2="0">
                <stop stop-color="rgba(253, 224, 71, 1)" offset="0%"></stop>
                <stop stop-color="rgba(255, 117.722, 11, 1)" offset="100%"></stop>
            </linearGradient>
        </defs>
        <path style="transform:translate(0, 100px); opacity:0.8" fill="url(#sw-gradient-2)"
              d="M0,147L60,138.8C120,131,240,114,360,163.3C480,212,600,327,720,318.5C840,310,960,180,1080,114.3C1200,49,1320,49,1440,89.8C1560,131,1680,212,1800,220.5C1920,229,2040,163,2160,138.8C2280,114,2400,131,2520,171.5C2640,212,2760,278,2880,326.7C3000,376,3120,408,3240,351.2C3360,294,3480,147,3600,89.8C3720,33,3840,65,3960,122.5C4080,180,4200,261,4320,277.7C4440,294,4560,245,4680,196C4800,147,4920,98,5040,114.3C5160,131,5280,212,5400,277.7C5520,343,5640,392,5760,359.3C5880,327,6000,212,6120,204.2C6240,196,6360,294,6480,326.7C6600,359,6720,327,6840,310.3C6960,294,7080,294,7200,294C7320,294,7440,294,7560,310.3C7680,327,7800,359,7920,343C8040,327,8160,261,8280,220.5C8400,180,8520,163,8580,155.2L8640,147L8640,490L8580,490C8520,490,8400,490,8280,490C8160,490,8040,490,7920,490C7800,490,7680,490,7560,490C7440,490,7320,490,7200,490C7080,490,6960,490,6840,490C6720,490,6600,490,6480,490C6360,490,6240,490,6120,490C6000,490,5880,490,5760,490C5640,490,5520,490,5400,490C5280,490,5160,490,5040,490C4920,490,4800,490,4680,490C4560,490,4440,490,4320,490C4200,490,4080,490,3960,490C3840,490,3720,490,3600,490C3480,490,3360,490,3240,490C3120,490,3000,490,2880,490C2760,490,2640,490,2520,490C2400,490,2280,490,2160,490C2040,490,1920,490,1800,490C1680,490,1560,490,1440,490C1320,490,1200,490,1080,490C960,490,840,490,720,490C600,490,480,490,360,490C240,490,120,490,60,490L0,490Z"></path>
    </svg>

        <section class="w-full bg-[#FCCA3A] text-black" aria-labelledby="faq-section">
            <div class="flex flex-col gap-4 justify-between align-center w-11/12 max-w-[1200px] mx-auto py-24">
                <h2 class="text-center text-4xl md:text-6xl" id="faq-section">FAQ</h2>
                <h3 class="underline text-center text-xl md:text-2xl">BunnyBooker</h3>
            <Accordion.Root class="w-full max-w-[600px] w-full mx-auto">
                <Accordion.Item value="item-1">
                    <Accordion.Trigger class="text-left">
                        How does BunnyBooker work?
                    </Accordion.Trigger>
                    <Accordion.Content>
                        <p class="py-2">
                            Once you have made an order, we will use our AI systems to predict when tickets will
                            refunded or re-released on the KTMB site.
                            Once a timeslot that matches your order has been refunded
                            and made available on the KTMB site, we will book the ticket on your behalf.
                        </p>
                        <p class="py-2">
                            We do not keep stock of any train tickets in our system and only make bookings based on
                            pending orders.
                        </p>
                    </Accordion.Content>
                </Accordion.Item>

                <Accordion.Item value="item-2">
                    <Accordion.Trigger class="text-left">
                        Why should I buy tickets via BunnyBooker?
                    </Accordion.Trigger>
                    <Accordion.Content>
                        <h3 class="font-semibold">Convenience</h3>
                        <p class="my-2">
                            Buying tickets on BunnyBooker saves you the time and hassle
                            from constantly going to the KTMB site to check on ticket availability
                            as our systems checks and books any available tickets as soon
                            as they are available.
                        </p>

                        <h3 class="font-semibold mt-6">Check order status anytime, anywhere </h3>
                        <p class="my-2">
                            BunnyBooker allows you to check the status of your
                            order whenever you like, allowing you to decide on the next steps of your travel.
                        </p>
                        <p class="my-2">
                            You will be able to check the status of each ticket per order,
                            and it will be either "Purchased" or "Pending".
                        </p>
                        <h3 class="font-semibold mt-6">Check ticket queue to plan for travels</h3>
                        <p class="my-2">
                            BunnyBooker allows you to see the number of tickets
                            pending before you in all the timeslots for the day
                            and train direction you have selected.
                        </p>
                        <p class="my-2">
                            e.g. Customer 1 placed an order for 3 people for CIQ -> JB SENTRAL at 8.30AM on 31/12/2023,
                            and customer 2 is looking to place an order for 5 people for the same direction, date and
                            time.
                            BunnyBooker queue will display "3 pending tickets" for Customer 2 to make an
                            informed choice of whether or not she wants to make the order for the
                            same timeslot or choose an alternative timeslot.
                        </p>
                        <h3 class="font-semibold mt-6">Safe</h3>
                        <p class="my-2">
                            BunnyBooker complies with PDPA and only retains
                            information consensually provided by you for fulfilling
                            booking orders, as well as marketing information
                            only if consent is given by you.
                        </p>
                    </Accordion.Content>
                </Accordion.Item>


                <Accordion.Item value="item-3">
                    <Accordion.Trigger class="text-left">
                        How can I check the purchase status of my order?
                    </Accordion.Trigger>
                    <Accordion.Content>
                        You can login to <a class="underline text-blue-600 hover:text-blue-800 visited:text-purple-600"
                                            href="https://bunnybooker.com">bunnybooker.com</a> and check the status of
                        your order.
                    </Accordion.Content>
                </Accordion.Item>

                <Accordion.Item value="item-4">
                    <Accordion.Trigger class="text-left">
                        Can I change my order after order confirmation?
                    </Accordion.Trigger>
                    <Accordion.Content>
                        <p class="my-2">
                            You can cancel tickets at any time. However, if the
                            tickets have been secured by our system, you will not be
                            refunded for the cancelled ticket.
                        </p>
                        <p class="my-2">
                            For more information on delivery, cancellation and refund policies,
                            see <a href="/policy" class="underline hover:text-amber-300">here</a>
                        </p>

                    </Accordion.Content>
                </Accordion.Item>

                <Accordion.Item value="item-5">
                    <Accordion.Trigger class="text-left">
                        Are refunds allowed?
                    </Accordion.Trigger>
                    <Accordion.Content>
                        <p class="my-2">
                            Full refunds are provided for tickets that have not been secured by our system.
                            However, tickets secured by our system can be cancelled, but will not be eligible
                            for refunds.
                        </p>
                        <p class="my-2">
                            For more information on delivery, cancellation and refund policies,
                            see <a href="/policy" class="underline hover:text-amber-300">here</a>
                        </p>
                    </Accordion.Content>
                </Accordion.Item>

                <Accordion.Item value="item-6">
                    <Accordion.Trigger class="text-left">
                        Does BunnyBooker allow preorders?
                    </Accordion.Trigger>
                    <Accordion.Content>
                        <p>
                            Preorders for unreleased tickets are allowed. There are
                            no limitations on how far in the future you may
                            place the order for.
                        </p>

                    </Accordion.Content>
                </Accordion.Item>

                <Accordion.Item value="item-7">
                    <Accordion.Trigger class="text-left">
                        How is my personal data handled?
                    </Accordion.Trigger>
                    <Accordion.Content>
                        <ol class="my-6 ml-6 list-decimal [&>li]:mt-2">
                            <li>All personal data are encrypted at rest in the database</li>
                            <li>No data is shared with external parties</li>
                            <li>No personal identifiable information is allowed to be accessed by internal staff</li>
                            <li>
                                Upon rejection of marketing permissions, no personal data will be collected
                                for marketing purposes and only essential information for booking tickets
                                will be collected
                            </li>
                            <li>
                                Upon deletion of account, all information related to the user will
                                instantly be deleted from our database
                            </li>
                        </ol>
                        <p class="my-2">
                            The above personal data handling is for BunnyBooker only. Click
                            <a href="/privacy" class="underline hover:text-amber-300">
                                here </a> to
                            read more about BunnyBooker's personal data handling.
                        </p>
                        <p class="my-2">
                            If you would like to find out how your personal data is handled on the KTMB website, you may
                            visit
                            <a class="underline hover:text-amber-300"
                               href="https://www.ktmb.com.my/assets/pdf/2022/customer_privacy_policy.pdf">here</a>
                        </p>
                    </Accordion.Content>
                </Accordion.Item>

                <Accordion.Item value="item-8">
                    <Accordion.Trigger class="text-left">
                        What is the success rate of BunnyBooker booking service?
                    </Accordion.Trigger>
                    <Accordion.Content>
                        To date, the success rate is <b class="font-semibold">100%</b>.
                    </Accordion.Content>
                </Accordion.Item>

            </Accordion.Root>
            <h4 class="underline text-center text-xl md:text-2xl">KTMB</h4>
            <Accordion.Root class="w-full max-w-[600px] w-full mx-auto">
                <Accordion.Item value="item-1">
                    <Accordion.Trigger class="text-left">
                        How does taking train between Singapore and JB work?
                    </Accordion.Trigger>
                    <Accordion.Content>
                        <p class="py-2">
                            Take for example, you have a 9.45am train ride from SG -> JB.
                        </p>
                        <p class="py-2">
                            Gates close strictly 20 minutes before train departure.
                            Therefore, it is best to be in the queue at least 30 minutes before train departure (at
                            9.15am).
                        </p>
                        <p class="py-2">
                            From 9.25am - 9.45am (the 20 minutes before departure),
                            All passengers will go through both Singapore & Malaysia customs
                            before the train ride (yes, you read it right, 2 customs settled before the train ride!)
                        </p>
                        <p class="py-2">
                            From 9.45am - 9.50am,
                            The train departs at 9.45am and you will arrive in JB sentral at 9.50am!
                        </p>
                        <p class="py-2">
                            At 9.50am,
                            Destination reached, you are free to roam!
                        </p>
                        <p>
                            NOTE: Train from JB-> SG closes <span class="underline">10 minutes</span>
                            before departure, train from SG -> JB (in above example) closes
                            <span class="underline">20 minutes</span> before departure.
                        </p>
                    </Accordion.Content>
                </Accordion.Item>

                <Accordion.Item value="item-2">
                    <Accordion.Trigger class="text-left">
                        What are the timeslots available for booking?
                    </Accordion.Trigger>
                    <Accordion.Content>

                        <Table.Root>
                            <Table.Caption>Timeslots available for booking</Table.Caption>
                            <Table.Header>
                                <Table.Row>
                                    <Table.Head class="text-center font-bold">SG -> JB</Table.Head>
                                    <Table.Head class="text-center font-bold">JB -> SG</Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {#each timings as timing, i (i)}
                                    <Table.Row>
                                        <Table.Cell class="text-center">{timing.w2j}</Table.Cell>
                                        <Table.Cell class="text-center">{timing.j2w}</Table.Cell>
                                    </Table.Row>
                                {/each}
                            </Table.Body>
                        </Table.Root>

                    </Accordion.Content>
                </Accordion.Item>

                <Accordion.Item value="item-3">
                    <Accordion.Trigger class="text-left">
                        When do the gates close before departure?
                    </Accordion.Trigger>
                    <Accordion.Content>

                        <p class="my-2">
                            <span class="font-semibold">Singapore to Johor: </span>
                            <span class="underline">20 minutes</span> before departure
                        </p>
                        <p class="my-2">
                            <span class="font-semibold">Johor to Singapore: </span>
                            <span class="underline">10 minutes</span> before departure
                        </p>

                    </Accordion.Content>
                </Accordion.Item>
                <Accordion.Item value="item-4">
                    <Accordion.Trigger class="text-left">
                        Why should I take the train to JB/SG instead of other modes of transport?
                    </Accordion.Trigger>
                    <Accordion.Content>
                        Booking a train is a reliable choice, avoiding unpredictable traffic and
                        potential 4-hour customs delays with other modes of transport. Limited
                        train seats and a dedicated customs check (only for train passengers) expedite
                        your journey, ensuring a swift 30-minute journey to your destination.

                    </Accordion.Content>
                </Accordion.Item>
            </Accordion.Root>
            </div>
        </section>

        <!-- Final CTA Section -->
        <section class="w-full bg-[#FCCA3A] text-black py-16 md:py-20">
            <div class="w-11/12 max-w-[1200px] mx-auto text-center">
                <h2 class="text-2xl md:text-4xl font-extrabold mb-6" style="font-family: 'Cabin', 'sans-serif';">Get Started Today</h2>
                <p class="text-base md:text-lg mb-8 text-slate-700" style="font-family: 'Raleway', 'sans-serif';">
                    Join thousands of travelers who trust BunnyBooker for their KTMB tickets.
                </p>
                <div class="mb-6">
                    {#if $page.data.session}
                        <Button size="lg" class="bg-black text-white hover:bg-gray-800 text-base md:text-lg px-6 py-3 md:px-8 md:py-4" on:click={track} href="/schedules">
                            <BookOpenCheck class="mr-2 h-4 w-4 md:h-5 md:w-5"/>
                            Book Now
                        </Button>
                    {:else}
                        <Button size="lg" class="bg-black text-white hover:bg-gray-800 text-base md:text-lg px-6 py-3 md:px-8 md:py-4" on:click={cta} disabled={loading}>
                            {#if loading}
                                <LucideLoader class="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin"/>
                            {:else}
                                <BookOpenCheck class="mr-2 h-4 w-4 md:h-5 md:w-5"/>
                            {/if}
                            Book Now
                        </Button>
                    {/if}
                </div>
                <p class="text-xs md:text-sm text-slate-600" style="font-family: 'Raleway', 'sans-serif';">
                    Full refund guarantee • Email notifications • Secure platform
                </p>
            </div>
        </section>

    </main>

</Page>
