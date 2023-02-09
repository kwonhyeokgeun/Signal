import React, { useState, useEffect } from 'react'
import 'assets/styles/projectMeeting.css'
import CodeEditIcon from 'assets/image/code-edit.png'
import MeetingDoor from 'assets/image/meeting-door.png'
import Share from 'assets/image/share.png'
import Eraser from 'assets/image/eraser.png'
import styled from '@emotion/styled'
import { css } from '@emotion/react'
import MeetingPresentTime from 'components/Meeting/MeetingPresentTime'
import Chatting from 'components/Meeting/Chatting'
import SignalBtn from 'components/common/SignalBtn'
import { videoList, codeEidt, share } from 'assets/styles/projectMeeting'
import io from 'socket.io-client'

let myStream

let myName
let roomId
let userNames // userNames[socketId]="이름"
let socketIds // socketIds["이름"]=socketId

let pcConfig

let sendPC
let receivePCs

let selfStream

let numOfUsers
let socket

const projectMeetingSetting = () => {
  socket = io('https://meeting.ssafysignal.site', { secure: true, cors: { origin: '*' } })
  // socket = io('https://localhost:443', { secure: true, cors: { origin: '*' } })
  console.log('프로젝트 미팅 소켓 통신 시작!')

  pcConfig = {
    iceServers: [
      {
        urls: 'stun:edu.uxis.co.kr',
      },
      {
        urls: 'turn:edu.uxis.co.kr?transport=tcp',
        username: 'webrtc',
        credential: 'webrtc100!',
      },
    ],
  }
  roomId = 'project1234'
  myName = sessionStorage.getItem('username')

  if (myName === null) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    const charactersLength = characters.length
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    myName = '익명' + result
  }

  userNames = {} // userNames[socketId]="이름"
  socketIds = {} // socketIds["이름"]=socketId

  sendPC = {
    // sendPC[purpose]=pc
    user: {}, // 유저 얼굴
    share: {}, // 화면공유
  }
  receivePCs = {
    // receivePCs[purpose][socketId]=pc
    user: {},
    share: {},
  }

  numOfUsers = 0

  socket.emit('room_info', {
    roomId,
    userName: myName,
  })
}

function ProjectMeeting() {
  if (socket == null) {
    projectMeetingSetting()

    // 기존 방의 유저수와 방장이름 얻어옴
    socket.on('room_info', (data) => {
      numOfUsers = data.numOfUsers + 1
      console.log(numOfUsers, '명이 이미 접속해있음')

      meetingStart()
    })

    // user가 들어오면 이미 들어와있던 user에게 수신되는 이벤트
    socket.on('user_enter', async (data) => {
      enterUserHandler(data)
    })

    // 처음 방에 접속했을 때, 이미 방안에 들어와있던 user들의 정보를 받음
    socket.on('all_users', (data) => {
      console.log('all_users : ', data.users)
      allUsersHandler(data) // 미리 접속한 유저들의 영상을 받기위한 pc, offer 생성
    })

    // 클라이언트 입장에서 보내는 역할의 peerConnection 객체에서 수신한 answer 메시지(sender_offer의 응답받음)
    socket.on('get_sender_answer', (data) => {
      try {
        console.log('get_sender_answer 받음')
        sendPC[data.purpose].setRemoteDescription(new RTCSessionDescription(data.answer))
      } catch (error) {
        console.error(error)
      }
    })

    // 클라이언트 입장에서 받는 역할의 peerConnection 객체에서 수신한 answer 메시지(receiver_offer의 응답받음)
    socket.on('get_receiver_answer', (data) => {
      try {
        const pc = receivePCs[data.purpose][data.id]
        if (pc.signalingState === 'stable') return // ?
        pc.setRemoteDescription(new RTCSessionDescription(data.answer))
      } catch (error) {
        console.error(error)
      }
    })

    // 보내는 역할의 peerConnection 객체에서 수신한 candidate 메시지
    socket.on('get_sender_candidate', (data) => {
      try {
        const pc = sendPC[data.purpose]
        if (!data.candidate) return
        if (!pc) return
        pc.addIceCandidate(new RTCIceCandidate(data.candidate))
      } catch (error) {
        console.error(error)
      }
    })

    // 받는 역할의 peerConnection 객체에서 수신한 candidate 메시지
    socket.on('get_receiver_candidate', (data) => {
      try {
        const pc = receivePCs[data.purpose][data.id]
        if (!data.candidate) return
        if (!pc) return
        pc.addIceCandidate(new RTCIceCandidate(data.candidate))
      } catch (error) {
        console.log(error)
      }
    })

    // 같은 방에 있던 user가 나가면 그 방 안에있던 모든 user들에게 전송되는 이벤트
    socket.on('user_exit', (data) => {
      exitUserHandler(data)
    })
  }

  // ============================================================================

  function meetingStart() {
    console.log('meetingStart 실행')
    setPersonList((personList) => [...personList, myName])
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: { width: 320, height: 240 },
      })
      .then(async (stream) => {
        myStream = stream

        setStreams((streams) => {
          const streams2 = { ...streams }
          streams2[myName] = stream
          return streams2
        })

        myStream.getVideoTracks().forEach((track) => (track.enabled = true)) // 초기에 mute
        myStream.getAudioTracks().forEach((track) => (track.enabled = false))

        // 내 영상 비디오에 띄우기
        selfStream = new MediaStream()
        selfStream.addTrack(stream.getVideoTracks()[0])
        // myVideo.srcObject = selfStream

        // 내 영상 전송용 pc와 offer생성
        sendPC.user = createSenderPeerConnection(stream, 'user')
        const offer = await createSenderOffer(sendPC.user)

        // 방에 입장 요청
        socket.emit('join_room', {
          roomId,
          userName: myName,
        })

        // sender_offer를 전송
        await socket.emit('sender_offer', {
          offer,
          purpose: 'user',
        })
      })
      .catch((error) => {
        console.error(error)
        if (!alert('카메라(또는 마이크)가 없거나 권한이 없습니다')) {
          // window.location = '..'
        }
      })
  }

  // 스트림 보내는 역할의 peerConnection 객체 생성
  function createSenderPeerConnection(stream, purpose, isAudioTrue = 1) {
    const pc = new RTCPeerConnection(pcConfig)

    pc.oniceconnectionstatechange = (e) => {
      // console.log(e);
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('sender_candidate', {
          candidate: e.candidate,
          purpose,
        })
      }
    }

    if (stream) {
      const videoTrack = stream.getVideoTracks()[0]
      const audioTrack = stream.getAudioTracks()[0]
      pc.addTrack(videoTrack, stream)
      // console.log("audio:",is_audio_true)
      if (isAudioTrue !== 0)
        // 나중에 수정하기
        pc.addTrack(audioTrack, stream)
    } else {
      console.log('no localStream')
    }

    return pc
  }

  // 스트림 받는 역할의 peerConnection 객체 생성
  function createReceiverPeerConnection(senderSocketId, userName, purpose) {
    const pc = new RTCPeerConnection(pcConfig)
    receivePCs[purpose][senderSocketId] = pc
    pc.oniceconnectionstatechange = (e) => {
      // console.log(e);
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        // 수신 candidate 보냄
        socket.emit('receiver_candidate', {
          candidate: e.candidate,
          receiverSocketId: socket.id,
          senderSocketId,
          purpose,
          roomId,
        })
      }
    }

    // 스트림 보내는 쪽의 peerConnection에서 addTrack시 이벤트 발생
    let once = 1
    pc.ontrack = (e) => {
      if (once === 1) {
        // stream을 video에 넣어주기
        if (purpose === 'user') {
          userOntrackHandler(e.streams[0], userName, senderSocketId)
        }
        // console.log('한번만 나오는지')
      }
      once += 1
    }

    return pc
  }

  // 보내는 역할의 peerConnection 객체에서 offer 전송 (통신 시작)
  async function createSenderOffer(pc) {
    try {
      const offer = await pc.createOffer({
        // 보내기 위함으로 false임..?
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      })
      await pc.setLocalDescription(new RTCSessionDescription(offer))

      // console.log("send offer:",offer);

      return offer
    } catch (error) {
      console.log(error)
    }
  }

  // 받는 역할의 peerConnection 객체에서 offer 전송 (통신 시작)
  async function createReceiverOffer(pc) {
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })
      await pc.setLocalDescription(new RTCSessionDescription(offer))

      return offer
    } catch (error) {
      console.error(error)
    }
  }

  // 기존 모든 유저들 영상을 받기위한 pc와 offer생성
  async function allUsersHandler(data) {
    // 자신을 제외한 모든 유저의 receiverPc생성, 비디오 생성(처음 접속했을 때 한번만)
    try {
      const len = data.users.length

      for (let i = 0; i < len; i++) {
        const socketId = data.users[i].socketId
        const userName = data.users[i].userName

        userNames[socketId] = userName
        socketIds[userName] = socketId

        // 기존 유저들 영상을 받을 pc와 offer를 생성
        const pc = createReceiverPeerConnection(socketId, userName, 'user')
        const offer = await createReceiverOffer(pc)

        // 수신 offer 보냄
        await socket.emit('receiver_offer', {
          offer,
          receiverSocketId: socket.id,
          senderSocketId: socketId,
          purpose: 'user',
        })
      }
    } catch (err) {
      console.error(err)
    }
  }

  // 누군가 들어왔을 때
  async function enterUserHandler(data) {
    try {
      const pc = createReceiverPeerConnection(data.socketId, data.userName, 'user')
      const offer = await createReceiverOffer(pc)

      userNames[data.socketId] = data.userName
      socketIds[data.userName] = data.socketId
      numOfUsers++

      await socket.emit('receiver_offer', {
        offer,
        receiverSocketId: socket.id,
        senderSocketId: data.socketId,
        purpose: 'user',
      })
    } catch (error) {
      console.error(error)
    }
  }

  // 유저별 stream을 video에 넣어줌(화면에 영상 띄움)
  function userOntrackHandler(stream, userName, senderSocketId) {
    console.log('접속자 이름:', userName)
    setPersonList((personList) => [...personList, userName])

    setStreams((streams) => {
      const streams2 = { ...streams }
      streams2[userName] = stream
      return streams2
    })
  }

  // 나간 유저 video삭제
  function removeUserVideo(socketId, userName) {
    setPersonList((personList) => {
      const personList2 = [...personList]
      for (let i = personList.length - 1; i >= 0; i--) {
        if (personList2[i] === userName) {
          personList2.splice(i, 1)
          break
        }
      }
      return personList2
    })

    setStreams((streams) => {
      const streams2 = { ...streams }
      delete streams2[userName]
      return streams2
    })
  }

  // 나간 유저의 정보 지우고 video 지우기
  function exitUserHandler(data) {
    const socketId = data.socketId
    const userName = data.userName

    numOfUsers--
    try {
      delete userNames[socketId]
      delete socketIds[userName]

      if (!receivePCs.user[socketId]) {
        receivePCs.user[socketId].close()
        delete receivePCs.user[socketId]
      }

      removeUserVideo(socketId, userName)

      console.log('나간사람 이름:', userName)
    } catch (e) {
      console.error(e)
    }
  }
  const [voice, setVoice] = useState(false)
  const [video, setVideo] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [color, setColor] = useState('black')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [personList, setPersonList] = useState([])
  const [streams, setStreams] = useState({})

  const [mode, setMode] = useState(0)

  useEffect(() => {
    const videos = document.querySelectorAll('.project-meeting-video')
    console.log('personList:', personList, 'streams:', streams)
    for (let i = 0; i < personList.length; i++) {
      const video = videos[i]
      video.autoplay = true
      video.playsinline = true
      if (personList[i] === myName) {
        videos[i].srcObject = selfStream
      } else {
        videos[i].srcObject = streams[personList[i]]
      }
    }
  }, [streams])

  const handleToVoice = () => {
    setVoice(!voice)
  }

  const handleToVideo = () => {
    setVideo(!video)
  }

  return (
    <div className="project-meeting-container">
      <div className="project-meeting-main">
        <VideoListSection className="project-meeting-video-list" mode={mode}>
          {personList.map((item, index) => (
            <VideoBox key={index} className="project-meeting-person" size={personList.length}>
              <video className="project-meeting-video" alt="나" style={{ width: '100%', height: '100%' }} />
              <div className="project-meeting-person-name">{item}</div>
            </VideoBox>
          ))}
        </VideoListSection>

        <CodeEditSection className="project-meeting-video-code-edit" mode={mode}>
          <video style={{ width: '100%', height: '100%' }}> 코드편집</video>
        </CodeEditSection>

        <ShareSection className="project-meeting-video-share-section" mode={mode}>
          <div className="project-meeting-video-share-palette">
            <div className="project-meeting-video-share-palette2">
              <div style={{ margin: '30px auto' }}>
                <SelectedColor color={color} onClick={() => setPaletteOpen(!paletteOpen)}></SelectedColor>
              </div>
              <div style={{ textAlign: 'center', margin: '30px' }}>
                <img src={Eraser} alt="" className="project-meeting-video-share-eraser" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <SignalBtn>모두지우기</SignalBtn>
              </div>
            </div>
          </div>
          {paletteOpen ? (
            <div className="project-meeting-video-share-color-palette">
              <Color onClick={() => setColor('black')} color={'black'}></Color>
              <Color onClick={() => setColor('white')} color={'white'}></Color>
              <Color onClick={() => setColor('red')} color={'red'}></Color>
              <Color onClick={() => setColor('blue')} color={'blue'}></Color>
            </div>
          ) : (
            ''
          )}
          <div className="project-meeting-video-share">
            <video style={{ width: '100%', height: '100%', borderRadius: '25px' }}> 비디오</video>
          </div>
          <div className="project-meeting-video-sare-painht" style={{ border: '1px solid' }}>
            <div
              style={{
                backgroundColor: 'rgba(87, 75, 159, 0.3)',
                width: '100%',
                height: '100%',
                borderRadius: '25px',
              }}
            >
              그림판
            </div>
          </div>
        </ShareSection>

        {chatOpen ? <Chatting key={100000}></Chatting> : ''}
      </div>

      <div className="project-meeting-footer">
        <div className="project-meeting-time">
          <MeetingPresentTime key={10000} personNum={personList.length}></MeetingPresentTime>
        </div>
        <div className="project-meeting-btn">
          <div className="project-meeting-btn-meeting-container" onClick={() => setMode(0)}>
            <img src={CodeEditIcon} alt="" className="project-meeting-btn-code-edit-icon" />
            <div className="project-meeting-btn-meeting">회의실</div>
          </div>
          <div className="project-meeting-btn-code-edit-container" onClick={() => setMode(1)}>
            <img src={CodeEditIcon} alt="" className="project-meeting-btn-code-edit-icon" />
            <div className="project-meeting-btn-code-edit">코드 편집</div>
            {/* 고정 아니여도 됨 */}
          </div>
          <div className="project-meeting-btn-share-container" onClick={() => setMode(2)}>
            <img src={Share} alt="" className="project-meeting-btn-share-icon" />
            <div className="project-meeting-btn-share">화면 공유</div>
            {/* 고정이여야함  absolute */}
          </div>
          <div className="project-meeting-btn-close-container" onClick={() => alert('close')}>
            <img src={MeetingDoor} alt="" className="project-meeting-btn-close-icon" />
            <div className="project-meeting-btn-close">종료</div>
          </div>
        </div>

        <div className="project-meeting-footer-right">
          {voice === false ? (
            <div className="project-meeting-footer-right-novoice" onClick={handleToVoice}></div>
          ) : (
            <div className="project-meeting-footer-right-voice" onClick={handleToVoice}></div>
          )}
          {video === false ? (
            <div className="project-meeting-footer-right-novideo" onClick={handleToVideo}></div>
          ) : (
            <div className="project-meeting-footer-right-video" onClick={handleToVideo}></div>
          )}
          <div className="project-meeting-footer-right-chat" onClick={() => setChatOpen(!chatOpen)}></div>
        </div>
      </div>
    </div>
  )
}
export default ProjectMeeting

const videobox = (props) => {
  if (props.size === 1) {
    return css`
      margin: 15px 15px;
      border: 1px solid black;
      width: 1200px;
      height: 650px;
      border-radius: 25px;
    `
  } else if (props.size === 2) {
    return css`
      margin: auto;
      border: 1px solid black;
      width: 700px;
      height: 650px;
      border-radius: 25px;
    `
  } else if (props.size === 3) {
    return css`
      margin: 100px 50px 50px 50px;
      border: 1px solid black;
      width: 550px;
      height: 500px;
      border-radius: 25px;
    `
  } else {
    return css`
      margin: 15px 15px;
      border: 1px solid black;
      width: 500px;
      height: 330px;
      border-radius: 25px;
    `
  }
}

const VideoBox = styled.div`
  ${videobox};
`

const colorBox = (props) => {
  const color = props.color
  return css`
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: ${color === 'white' ? '1px solid black' : ''};
    margin: 15px 0px;
    background-color: ${color === 'black'
      ? '#000'
      : color === 'white'
      ? '#fff'
      : color === 'red'
      ? '#FF3333'
      : '#0075FF'};
    :hover {
      cursor: pointer;
    }
  `
}
const Color = styled.div`
  ${colorBox}
`

const selectedColor = (props) => {
  const color = props.color
  return css`
    border-radius: 20px;
    background-color: ${color};
    width: 80px;
    height: 80px;
    margin: auto;
    cursor: pointer;
  `
}

const SelectedColor = styled.div`
  ${selectedColor}
`

const VideoListSection = styled.div`
  ${videoList}
`
const CodeEditSection = styled.div`
  ${codeEidt}
`

const ShareSection = styled.div`
  ${share}
`