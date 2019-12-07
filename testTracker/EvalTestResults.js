const axios = require('axios')

const triageData = [
  { 
    and: [`Timed out retrying: Expected to find element: 'button.ms-Dropdown-item[title="Enum"]', but never found it.`],
    bugs: [2409],
  },
  {
    and: [`Bugs 2389 & 2400 - Entity Detection panel shows a phrase that is different than the user's utterance.`],
    bugs: [2389, 2400]
  },
  {
    and: [
      "Timed out retrying: Expected to find content: 'z-rename-",
      "within the element: <div.css-69> but never did.",
    ],
    bugs: [2407],
  },
  {
    and: [`CypressError: Timed out retrying: Expected to find element: '[data-testid="app-index-model-name"]', but never found it.`],
    bugs: [2408],
  }
]

async function GetTriageDetailsAboutTestFailure(log) {
  return await GetApiData(log.url).then(logText => {
    try {
      console.log(`GetTriageDetailsAboutTestFailure - start`)
      const searchForFailureMessage = '\nFailure Message: '
      let failureMessage
      
      let index = logText.lastIndexOf(searchForFailureMessage)
      if (index == -1) {
        console.log(`GetTriageDetailsAboutTestFailure - not found error`)
        failureMessage = 'ERROR: Failure Message was not found in this log file.'
      } else {
        failureMessage = logText.substring(index + searchForFailureMessage.length)

        for(let i = 0; i < triageData.length; i++) {
          console.log(`GetTriageDetailsAboutTestFailure - for i=${i}`)
          let and = triageData[i].and
          if (and && Array.isArray(and)) {
            if (and.findIndex(matchString => !failureMessage.includes(matchString)) >= 0) {
              console.log(`GetTriageDetailsAboutTestFailure - continue not a match`)
              continue // because this one is not a match
            }
            console.log(`GetTriageDetailsAboutTestFailure returns: { message: ${failureMessage}, bugs: ${triageData[i].bugs} }`)
            return { message: failureMessage, bugs: triageData[i].bugs }
          }
        }
      }
      console.log(`GetTriageDetailsAboutTestFailure returns: ${failureMessage}`)
      return failureMessage
    }
    catch(error) {
      console.log(`!!! ERROR: ${error.message}`)
    }
  })
}

async function GetApiData(url) {
  return await axios.get(url).then(response => {
    return response.data
  })
  .catch(err => {
    console.log(`GetApiData - Error accessing: ${url}`)
    console.log(err.message)
  })
}

(async function() {

  const buildNumber = 5390
  let logs = []
  let mp4s = []
  let pngs = []
  let unknownTestFailures = []
  let knownTestFailures = []
  let passingTests = []
  let errors = []

  let iStart
  let iEnd
  let iSpec
  let testName
  let key

  const artifacts = await GetApiData(`https://circleci.com/api/v1.1/project/github/microsoft/ConversationLearner-UI/${buildNumber}/artifacts?circle-token=2ad1e457047948114cb3bbb1957d6f90c1e2ee25`)
  MoveArtifactJsonIntoArrays()
  console.log('Processing the Failed Test Results ----------------------------------')
  await ProcessFailingTestArtifacts()
  console.log('Processing the Passed Test Results ----------------------------------')
  ProcessPassingTestArtifacts()
  RenderResults()

  function MoveArtifactJsonIntoArrays() {
    artifacts.forEach(artifact => {
      const suffix = artifact.url.substring(artifact.url.length - 3)
      switch (suffix) {
        case 'log':
            iStart = artifact.url.indexOf('/cypress/') + '/cypress/'.length
            iEnd = artifact.url.length - '.19.12.05.02.42.14..456.log'.length
            key = artifact.url.substring(iStart, iEnd)
            console.log(key)
            console.log(artifact.url)
            logs.push({ key: key, url: artifact.url })
          break

        case 'mp4':
            iStart = artifact.url.indexOf('/videos/') + '/videos/'.length
            iEnd = artifact.url.length - 4
            testName = artifact.url.substring(iStart, iEnd)
            key = testName.replace(/\/|\\/g, "-")
            console.log(testName)
            console.log(key)
            console.log(artifact.url)
            mp4s.push({ testName: testName, key: key, url: artifact.url })
          break
        
        case 'png':
          iStart = artifact.url.indexOf('/screenshots/') + '/screenshots/'.length
          iSpec = artifact.url.indexOf('.spec.', iStart)
          iEnd = artifact.url.indexOf('/', iSpec)
          testName = artifact.url.substring(iStart, iEnd)
          key = testName.replace(/\/|\\/g, "-")
          console.log(testName)
          console.log(key)
          console.log(artifact.url)
          pngs.push({ testName: testName, key: key, url: artifact.url })
          break
        
        default:
          break
      }
    })
  }

  async function ProcessFailingTestArtifacts() {
    for(let i = 0; i < pngs.length; i++) {
      const png = pngs[i]
      let error
      let failureDetails
      
      //if (png.testName.endsWith('.ts')) continue

      console.log(`*** PNG: ${png.testName} *****************************`)

      const log = logs.find(log => log.key === png.key)
      if (!log) {
        console.log(`ProcessFailingTestArtifacts - going to return since log is undefined`)  
        errors.push({ testName: png.testName, key: png.key, url: 'page error: Log file not found' })
        continue
      }
      
      console.log(`ProcessFailingTestArtifacts - going to await GetTriageDetailsAboutTestFailure`)
      failureDetails = await GetTriageDetailsAboutTestFailure(log)
      if (typeof failureDetails == 'string') {
        console.log(`ProcessFailingTestArtifacts got failureDetails: ${failureDetails}`)
      } else {
        console.log(`ProcessFailingTestArtifacts got failureDetails: { message: ${failureDetails.message}, bugs: ${failureDetails.bugs} }`)
      }

      const mp4 = mp4s.find(mp4 => mp4.key === png.key)
      if (!mp4) {
        console.log('ProcessFailingTestArtifacts - ERROR: Did not find matching mp4')
        errors.push({ testName: png.testName, key: png.key, url: 'page error: mp4 file not found' })
        continue
      }

      let testFailure = {
        testName: png.testName,
        key: png.key,
        snapshotUrl: png.url,
        videoUrl: mp4.url,
        logUrl: log.url,
      }

      if (typeof failureDetails == 'string') {
        testFailure.failureMessage = failureDetails
        unknownTestFailures.push(testFailure)
        console.log('ProcessFailingTestArtifacts - Unknown Test Failure')
      } else {
        testFailure.failureMessage = failureDetails.message
        testFailure.bugs = failureDetails.bugs
        knownTestFailures.push(testFailure)
        console.log('ProcessFailingTestArtifacts - Known Test Failure')
      }
    }
  }

  function ProcessPassingTestArtifacts() {
    logs.forEach(log => {
      if (unknownTestFailures.findIndex(failure => failure.key === log.key) >= 0) return
      if (knownTestFailures.findIndex(failure => failure.key === log.key) >= 0) return

      const mp4 = mp4s.find(mp4 => mp4.key === log.key)
      if (!mp4) {
        errors.push({ testName: log.key, key: log.key, url: 'page error: mp4 file not found' })
        return
      }

      passingTests.push({
        testName: mp4.testName,
        videoUrl: mp4.url,
        logUrl: log.url,
      })
    })
  }

  function RenderResults() {
    console.log(`${unknownTestFailures.length} UNKNOWN TEST FAILURES -------------------------------------------------------`)
    unknownTestFailures.forEach(unknownTestFailure => {
      console.log(`unknownTestFailures.push({
        testName: '${unknownTestFailure.testName}',
        key: ${unknownTestFailure.key},
        snapshotUrl: '${unknownTestFailure.snapshotUrl}',
        videoUrl: '${unknownTestFailure.videoUrl}',
        logUrl: '${unknownTestFailure.logUrl}',
        failureMessage: '${unknownTestFailure.failureMessage}',
      })`)
    })

    console.log(`${knownTestFailures.length} KNOWN TEST FAILURES ---------------------------------------------------------`)
    knownTestFailures.forEach(knownTestFailure => {
      console.log(`knownTestFailures.push({
        testName: '${knownTestFailure.testName}',
        key: ${knownTestFailure.key},
        snapshotUrl: '${knownTestFailure.snapshotUrl}',
        videoUrl: '${knownTestFailure.videoUrl}',
        logUrl: '${knownTestFailure.logUrl}',
        failureMessage: '${knownTestFailure.failureMessage}',
        bugs: '${knownTestFailure.bugs}',
      })`)
    })

    console.log(`${passingTests.length} PASSING TESTS ---------------------------------------------------------------`)
    passingTests.forEach(passingTest => {
      console.log(`passingTests.push({
        testName: '${passingTest.testName}',
        videoUrl: '${passingTest.videoUrl}',
        logUrl: '${passingTest.logUrl}',
      })`)
    })

    console.log(`${errors.length} ERRORS ---------------------------------------------------------------`)
    errors.forEach(error => {
      console.log(`errors.push({
        testName: '${error.testName}',
        key: '${error.key}',
        url: '${error.url}',
      })`)
    })
  }
}())
