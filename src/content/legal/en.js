/**
 * The English version of the legal texts.
 *
 * A translation of src/content/legal/nl.js, and it has to be kept in step with
 * it. The Dutch text is the one that governs: this site is operated from
 * Belgium for Dutch-speaking schools, and the renderer says so on the page.
 */

export const legalEn = {
  /* ====================================================================== */
  privacy: {
    title: 'Privacy policy',
    intro:
      'This is a learning environment for children. So we keep as little data as ' +
      'possible, and set out below exactly what we keep, why we need it, and how ' +
      'you get rid of it.',
    sections: [
      {
        h: 'Who is responsible',
        p: [
          '{legalName}, {address}, company number {companyNumber}, is the data controller for everything processed through {appUrl}.',
          'Questions about your data? Email {email}. We answer within 30 days, as the GDPR requires.'
        ]
      },
      {
        h: 'What we keep',
        p: ['We treat two kinds of user differently, because we deliberately know less about children.'],
        list: [
          'For a teacher or administrator: email address, name, role, and when the account was created.',
          'For a child: a first name and a password, and nothing else. We never ask a child for an email address. Every account technically needs one, so for children we build an internal address on a domain nobody owns (emma@leerling.start2code.app, for example). No mail ever arrives there and none is ever sent.',
          'For everyone: the projects you make (the title, your Scratch or Python code, and the preview image), which lesson steps you ticked, and which class you are in.',
          'For submitted work: the teacher\'s assessment — passed or not, a score, and the comments the teacher writes with it.',
          'A short activity list: that a project was created, saved or run, with the time. It holds no IP address, no location and nothing about your browser.'
        ]
      },
      {
        h: 'What we do not do',
        list: [
          'We never sell or rent data, to anyone.',
          'There is no advertising network, no tracking pixel and no visitor analytics on this site.',
          'We build no profiles and make no automated decisions about children.',
          'We send no marketing. The only mail we send is about your own account: confirming it is you, or setting a new password.',
          'We do not ask children for a surname, address, date of birth, phone number or photograph.'
        ]
      },
      {
        h: 'Our legal basis',
        p: [
          'For teachers and schools we process data to perform the agreement made with CodeLab: no account, no lesson.',
          'For children, processing happens on the school\'s instruction, as part of the education the school provides. The school obtains parental permission and decides who gets an account; we never create a child\'s account other than through their teacher.',
          'Children under 13 cannot register here themselves. That is deliberate: below that age a child in Belgium cannot validly consent to an online service on their own.'
        ]
      },
      {
        h: 'Camera and microphone in Scratch',
        p: [
          'Scratch can record a sound or use the webcam (the "video sensing" blocks). That only happens if the child chooses it and the browser asks permission — we never switch it on ourselves.',
          'Video is used inside the browser only and never leaves the device. A sound recording the child keeps does become part of the project, and so is stored with the saved file. If you would rather avoid that, do not let children keep recordings, or delete the project.'
        ]
      },
      {
        h: 'Who else sees it',
        p: ['Only those who need to:'],
        list: [
          'The class teacher sees the projects, progress and submitted work of the children in that class.',
          'An administrator at {legalName} can reach all data, in order to keep the service running.',
          'Children do not see each other\'s work. There is no chat, no profile page and no public gallery.'
        ]
      },
      {
        h: 'Processors and third parties',
        p: [
          'We hand the technical work to a small number of companies. Each is bound by its data processing agreement, and none gets more than it needs.'
        ],
        list: [
          'Supabase — database, login and file storage. Your account, your projects and your progress live here. Region: {dataRegion}.',
          'Hostinger — the web hosting the site itself is served from.',
          'PyScript (pyscript.net) — fetched as soon as you open a Python project. Your Python runs entirely in your own browser; your code is not sent there. Because your browser fetches the file, that company does see your IP address.',
          'The Scratch asset library (scratch.mit.edu) — contacted when you pick a sprite or backdrop from the library. The same applies: your browser fetches a picture, so that address sees your IP. Your project is not sent there.'
        ]
      },
      {
        h: 'How long we keep it',
        list: [
          'Your account and your projects stay for as long as you want them.',
          'If the school or teacher asks for a class to be removed, we delete those children\'s accounts and everything attached to them.',
          'An account that has not been logged into for 24 months is deleted.',
          'If you delete your own account, your projects, progress and assessments go with it. That cannot be undone.'
        ]
      },
      {
        h: 'Your rights',
        p: [
          'You may see your data, have it corrected, have it erased, take it elsewhere, or object to the processing. For a child, the parent or the school exercises that right.',
          'Seeing and taking it is immediate and self-service: log in and use "My data" to download everything as a file. Deleting is there too, or email {email}.',
          'If you disagree with how we handle your data, you may complain to the {dpaName}, {dpaAddress} — {dpaUrl}.'
        ]
      },
      {
        h: 'Security',
        p: [
          'All traffic runs over https. Passwords are never stored readably. The database allows each row to be seen only by the user entitled to it, and that is enforced by the database itself rather than by the app alone.',
          'If something does go wrong with personal data, we report it to the Belgian Data Protection Authority within 72 hours and tell the schools involved.'
        ]
      }
    ]
  },

  /* ====================================================================== */
  terms: {
    title: 'Terms of service',
    intro: 'Short agreements about using {name}.',
    sections: [
      {
        h: 'Who we are',
        p: ['{name} is operated by {legalName}, {address}, company number {companyNumber}, reachable at {email}.']
      },
      {
        h: 'What the service is for',
        p: [
          '{name} is a learning environment where children learn to program with Scratch and with Python. Access comes with enrolment in the CodeLab lessons at {parentUrl}.',
          'Nothing is sold on this site and you are never asked to pay here. If a screen here does ask for your card details, it is not ours — close it and tell {email}.'
        ]
      },
      {
        h: 'Accounts',
        list: [
          'Children\'s accounts are created by the teacher. Children cannot register here themselves.',
          'A teacher account is personal. Do not share your password.',
          'You are responsible for what happens with your account. If you think someone else can get in, change your password and let us know.'
        ]
      },
      {
        h: 'What you make stays yours',
        p: [
          'The projects you make are yours. We use them only to run the service: storing them, showing them to you, and showing them to your teacher so the work can be marked.',
          'We publish no child\'s work anywhere and use none of it for promotion.'
        ]
      },
      {
        h: 'What is not allowed',
        list: [
          'Using someone else\'s account, or trying to reach data not meant for you.',
          'Overloading the service or working around its security.',
          'Uploading material that is hurtful or unlawful, or that you do not hold the rights to.'
        ]
      },
      {
        h: 'Availability',
        p: [
          'We do our best to keep the service running, but promise no uninterrupted availability. Maintenance, an outage at a supplier, or a school network blocking us can all put it out of reach for a while.',
          'Keep important work outside the site as well: every project has a download button.'
        ]
      },
      {
        h: 'Liability',
        p: [
          'We are liable for damage caused by our intent or gross negligence. Beyond that our liability is limited to what was paid for the enrolment concerned.',
          'Nothing in these terms limits rights you hold as a consumer by law.'
        ]
      },
      {
        h: 'Changes and governing law',
        p: [
          'If these terms change materially, we show you at login before you carry on. The date at the bottom says when this version took effect.',
          'Belgian law governs these terms. Disputes belong before the competent courts in Belgium.'
        ]
      }
    ]
  },

  /* ====================================================================== */
  cookies: {
    title: 'Cookies and local storage',
    intro:
      'This site uses no tracking cookies and no advertising cookies. There is no visitor ' +
      'analytics on it. What we do store is listed below, in full.',
    sections: [
      {
        h: 'No cookies, really',
        p: [
          'We set no cookies at all. What the site keeps, it keeps in your own browser\'s local storage. That is never attached automatically to a request to a server, and it stays on your device.',
          'Everything below is necessary to make the site work. That is why we do not ask permission for it — the rules do not require consent for this. We do tell you what is there, because you are entitled to know.'
        ]
      },
      {
        h: 'Exactly what is stored',
        list: [
          'sb-…-auth-token — your login session. Without it you would log in again on every click. Stays until you log out.',
          's2c:lang — the language you picked, so the site is right next time.',
          's2c:lesson-… — which lesson steps you ticked, so the tick is there straight away. The same is kept in the database so you find it again on another computer.',
          's2c:cookie-notice — that you have read this notice, so we stop showing it.',
          's2c-use-proxy — only if your school network blocks our database: a note that we have to take the detour. Gone when you close the tab.',
          's2c:recovering — a temporary note after a failed page load, so the site can reload itself once. Gone when you close the tab.'
        ]
      },
      {
        h: 'Clearing it',
        p: [
          'You can always clear this yourself through your browser settings ("clear site data"). You will be logged out and the site returns to Dutch; nothing else is lost, because your work is in the database.'
        ]
      },
      {
        h: 'Fetched from elsewhere',
        p: [
          'Two parts are fetched from another address, and only when you need them. That company then sees your IP address, as with any image on the internet. They set no cookie and never see your work.'
        ],
        list: [
          'pyscript.net — as soon as you open a Python project.',
          'scratch.mit.edu — as soon as you pick a sprite or backdrop from the Scratch library.'
        ]
      }
    ]
  },

  /* ====================================================================== */
  refund: {
    title: 'Payments and refunds',
    intro: 'Briefly: you pay nothing on this site.',
    sections: [
      {
        h: 'Nothing is charged here',
        p: [
          'There is nothing to buy on {appUrl}. No subscriptions, no credits, no paid extras and no fees that turn up later. Everything you see in the app is included in your access.',
          'Access to {name} comes with enrolment in the CodeLab lessons at {parentUrl}. Payment happens there, at enrolment.'
        ]
      },
      {
        h: 'Refunds',
        p: [
          'Because payment belongs to the lesson enrolment, that enrolment\'s terms apply, including for refunds and cancellation. You will find them at {parentUrl}, or ask for them at {email}.',
          'When the enrolment ends, access to {name} ends. Fetch your work first: every project has a download button, and "My data" downloads everything at once.'
        ]
      },
      {
        h: 'If we stop',
        p: [
          'Were we ever to shut {name} down, we would tell enrolled schools at least 30 days beforehand, so there is time to download all the work.'
        ]
      }
    ]
  },

  /* ====================================================================== */
  accessibility: {
    title: 'Accessibility',
    intro:
      'This site is used by children, and they differ from one another more than adults ' +
      'do. Below is an honest account of what works and what does not yet.',
    sections: [
      {
        h: 'What we aim for',
        p: ['WCAG 2.1 level AA. We are not there everywhere, but it is the bar.']
      },
      {
        h: 'What works',
        list: [
          'The whole site can be used from the keyboard. Where you are is always visible as a clear outline.',
          'Every page starts with a link that skips the navigation. It appears as soon as you press Tab.',
          'Text and buttons meet the 4.5:1 contrast ratio the standard asks for.',
          'You can zoom to 200% without losing anything.',
          'If you turn on "reduce motion" in your operating system, the site stops moving.',
          'The language is set per page, so a screen reader picks the right pronunciation.'
        ]
      },
      {
        h: 'What does not work well yet',
        list: [
          'The Scratch editor comes from the Scratch team itself. It can only partly be used from the keyboard: dragging blocks needs a mouse. We cannot fix that without rewriting Scratch.',
          'A Python game\'s stage is a picture; a screen reader cannot follow what happens in it.',
          'Part of the teacher screens is not translated yet and appears in English.'
        ]
      },
      {
        h: 'Found something?',
        p: [
          'If you get stuck, email {email} and describe where it went wrong. We take it seriously and answer within 30 days.'
        ]
      }
    ]
  },

  /* ====================================================================== */
  licenses: {
    title: 'Material used, and its licences',
    intro: 'What we use from others, and on what terms.',
    sections: [
      {
        h: 'Scratch',
        p: [
          'The block editor is Scratch, made by the Lifelong Kindergarten Group at the MIT Media Lab. Its code is under the BSD 3-Clause licence; the sprites, backdrops and sounds in the library are under Creative Commons BY-SA 4.0.',
          'Scratch is a trademark of MIT. This site is not made by, affiliated with or endorsed by Scratch or MIT.'
        ]
      },
      {
        h: 'Python in the browser',
        p: [
          'Python runs in your browser through PyScript and Pyodide (both Apache 2.0), which bring CPython (PSF licence) and pygame-ce (LGPL 2.1) with them.'
        ]
      },
      {
        h: 'Typefaces',
        p: [
          'Inter (Rasmus Andersson) and JetBrains Mono (JetBrains) are both under the SIL Open Font License 1.1. They are served from our own server rather than a font service, so loading a page sends nothing about you to a third party.',
          'The full licence text sits with the fonts, at /fonts/OFL.txt.'
        ]
      },
      {
        h: 'Images',
        p: [
          'The logo was commissioned by {legalName} and belongs to {legalName}.',
          'The symbols in the app are emoji. Your own operating system draws those; we ship no image for them.'
        ]
      },
      {
        h: 'And the rest',
        p: [
          'The app itself runs on React (MIT), React Router (MIT), Vite (MIT) and the Supabase library (MIT). The full list with versions is in package.json in the source.'
        ]
      }
    ]
  },

  /* ====================================================================== */
  deletion: {
    title: 'Asking for your data to be deleted',
    intro:
      'You have the right to have your data erased, and that should be easy. Here are ' +
      'the three ways, quickest first.',
    sections: [
      {
        h: 'Yourself, right now',
        p: [
          'Log in and go to "My data". There are two buttons: one downloads everything, the other deletes your account for good.',
          'Deleting erases your account, your projects, your progress, your submitted work and the assessments attached to it. It cannot be undone, so download what you want to keep first.'
        ]
      },
      {
        h: 'For a child',
        p: [
          'The teacher can take a child out of the class and delete the account. Parents who want this ask the teacher, or us directly.'
        ]
      },
      {
        h: 'By email',
        p: [
          'Email {email} with the first name or email address of the account. To avoid deleting the wrong one, we ask for confirmation once.',
          'We handle the request within 30 days and tell you when it is done. There is no charge.'
        ]
      },
      {
        h: 'What may still exist afterwards',
        p: [
          'Database backups are overwritten automatically after 30 days. During that window your data can still be in one; we never restore a backup to retrieve deleted data.'
        ]
      }
    ]
  }
}
