/*
 * @Description: 
 * @Author: lushevol
 * @Date: 2019-08-27 17:53:38
 * @LastEditors: lushevol
 * @LastEditTime: 2019-09-08 22:09:15
 */
import SIP, { Transport } from 'sip.js'
import { ISipAddress, ISipAccount, ISessionParams, ICallbackObj, IErrorMsg, OutgoingSession, IncomingSession, IMediaDom, IModifiers } from './sipphone.declar'

class sipphone {
  public sipServers: ISipAddress[] = [];
  public sipAccount: ISipAccount = {
    name: 'unkown user',
    no: '',
    pwd: ''
  };
  public SipUA: any;
  public currentSession: IncomingSession| OutgoingSession | null = null;
  private currentSessionParams: ISessionParams = {
    audio: true,
    video: true
  };
  private videoTrack: MediaStreamTrack[] = [];
  public callback: ICallbackObj = {};
  public mediaDom!: IMediaDom;
  public modifiersParams: IModifiers = { ptime: '20', capturerate: '24000', bitrate: '30000' };

  constructor(account: ISipAccount, server: ISipAddress[]) {
    this.sipAccount = account
    this.sipServers = server
    this.registCallbacks()
  }

  // initial sip instance
  public init(md: IMediaDom) {
    const config = this.sipConfig
    this.SipUA = new SIP.UA(config)
    this.bindSipUAEvents()
    this.initialMediaDom(md)
    return this.SipUA
  }

  public initialMediaDom(md: IMediaDom) {
    if(md.remoteAudio) {
      this.mediaDom.remoteAudio = md.remoteAudio
    }
    if(md.remoteVideo) {
      this.mediaDom.remoteVideo = md.remoteVideo
    }
    if(md.localVideo) {
      this.mediaDom.localVideo = md.localVideo
    }
  }

  // bind callback events on sipua
  private bindSipUAEvents() {
    // 当UA被其他用户拨打时（Call In）
    this.SipUA.on('invite', (session: IncomingSession) => {
      this.onInviteEvent(session)
    })

    // 当连接到server时的回调
    this.SipUA.on('connecting', () => {
      console.log(`[sipcall] on connecting`)
    })

    // 当完成连接时的回调
    this.SipUA.on('connected', () => {
      // 如果用户已注册，则发出"已准备好"信号，否则发出"未准备好"
      console.log(`[sipcall] on connected`)
    })

    // 当用户退出登录时
    this.SipUA.on('unregistered', (response: string, cause: string) => {
      console.log(`[sipcall] on unregistered ${response} ${cause}`)
    })

    // 当用户以登录时
    this.SipUA.on('registered', () => {
      console.log(`[sipcall] on registered`)
    })

    // 当用户断开连接时
    this.SipUA.on('disconnected', () => {
      console.log(`[sipcall] on disconnected`)
    })

    // 当注册失败时
    this.SipUA.on('registrationFailed', (response: string, cause: string) => {
      console.log(`[sipcall] on registrationFailed`)
    })

    this.SipUA.on('transportCreated', (transport: Transport) => {
      transport.on('transportError', this.onTransportError.bind(this))
    })

    this.SipUA.on('message', (message: string) => {
      console.log('[sipcall] on receive message')
    })
  }

  // when someone invite you , tigger this function.
  private onInviteEvent(session: IncomingSession) {
    // if is talking
    if (this.currentSession !== null) {
      (session as SIP.ServerContext).reject({
        statusCode: 486
      })
      return false
    }

    this.currentSession = session
    this.setParamsBySessionMediaType(this.currentSession)
    this.bindIncomingCallSessionEvent(this.currentSession)
    if (this.isIncomingCallFromInternal(this.currentSession)) {
      this.callback.callIn(this.currentSession)
    } else {
      this.callback.callBack(this.currentSession)
    }
  }

  /**
   * @description: SDP modifiers
   * @param {type}
   * @return:
   */
  private generateModifiers(modifiers: IModifiers = { ptime: '20', capturerate: '24000', bitrate: '30000' }) {
    const myModifier = (description: RTCSessionDescriptionInit) => {
      description.sdp = (description as RTCSessionDescription).sdp.replace(/a=fmtp:111 minptime=10;useinbandfec=1/img, `a=fmtp:111 ptime=${modifiers.ptime}; useinbandfec=1; maxplaybackrate=${modifiers.bitrate}; sprop-maxcapturerate=${modifiers.capturerate}; maxaveragebitrate=${modifiers.bitrate}; usedtx=1`);
      return Promise.resolve(description);
    };

    const modifierArray = [myModifier, SIP.Web.Modifiers.stripTelephoneEvent];
    return modifierArray;
  }

  /**
   * 呼叫其他用户
   * @params: number 用户号码, mediaType 媒体类型（audio音频/video视频）
  */
  invite(number: string, mediaType: string = 'audio', password?: string) {
  // 如果是视频
    const video = (mediaType === 'video')
    this.setCurrentSessionParams({ video })

    // uri
    const uri = new SIP.URI('', number, this.sipServers[0].server)
    // 如果有密码，则在params中传入密码
    if (password) {
      uri.setParam('aaa', 'bbb') // 应后端需要，增加占位参数
      uri.setParam('matrix_conference_pin', password)
    }
    // descriptionModifier
    const modifiers = this.generateModifiers(this.modifiersParams);
    // 呼叫其他用户，并返回该通话的session
    this.currentSession = this.SipUA.invite(uri, this.SessionParams)
    // 绑定当前session
    this.bindOutgoingCallSessionEvent(this.currentSession as OutgoingSession)
    // 呼出回调
    this.callback.callOut()
  }

  // is this coming call from internal (means outcall 's callback)
  private isIncomingCallFromInternal(session: IncomingSession) {
    // 如果呼入方是internal(内部)，则是回呼
    if (session && session.request && session.request.from && session.request.from.displayName === 'internal') {
      return false
    } else {
      return true
    }
  }

  private onTransportError() {

  }

  private bindOutgoingCallSessionEvent(session: OutgoingSession) {
    // 同意通话时
    session.on('accepted', (response: SIP.IncomingResponse, cause: string) => {
      console.log(`[sipcall] session accepted \n ${response} ${cause}`)
      this.callback.accepted()
    })

    // 被拒绝时
    // Fired each time an unsuccessful final (300-699) response is received. Note: This will also emit a failed event, followed by a terminated event.
    session.on('rejected', (response: SIP.IncomingResponse, cause: string) => {
      console.log(`[sipcall] session rejected ${response} ${cause}`)
      this.callback.stopTracks()
      // 被动挂断
      this.callback.hungup()
      this.callback.callEnd()
    })

    // 被拒绝时
    // Fired each time an unsuccessful final (300-699) response is received. Note: This will also emit a failed event, followed by a terminated event.
    session.on('rejected', (response: SIP.IncomingResponse, cause: string) => {
      console.log(`[sipcall] session rejected ${response} ${cause}`)
      this.callback.stopTracks()
      // 被动挂断
      this.callback.hungup()
      this.callback.callEnd()
    })

    session.on('failed', (response: SIP.IncomingResponse, cause: string) => {
      console.log('[sipcall debug]', response)
      const error = this.parseError(response)
      this.callback.error(error)
    })
  }

  // bind event on session
  private bindIncomingCallSessionEvent(session: IncomingSession) {
    // 被结束时
    session.on('bye', (request: SIP.IncomingRequest) => {
      console.log(`[sipcall] session bye`, request)
      this.callback.stopTracks()
      // 被动挂断
      this.callback.hungup()
      this.callback.callEnd()
    })

    // 通话被取消时
    session.on('cancel', () => {
      console.log(`[sipcall] session cancel`)
      this.callback.stopTracks()
      // 被动挂断
      this.callback.hungup()
      this.callback.callEnd()
    });

    (session as SIP.ServerContext).on('failed', (request: SIP.IncomingRequest, cause: string) => {
      console.log('[sipcall debug]', request)
      const error = this.parseError(request)
      this.callback.error(error)
    })

    // 有音视频流加入时
    // 仅展示的媒体类型
    session.on('trackAdded', () => {
      if (this.currentSessionParams.video) {
        console.log('[sipcall] video track comming ...')
        // localVideo.muted = true;
        // We need to check the peer connection to determine which track was added

        const pc = (session as any).sessionDescriptionHandler.peerConnection

        // Gets remote tracks
        const remoteStream = new MediaStream()
        pc.getReceivers().forEach(function(receiver: RTCRtpReceiver) {
          remoteStream.addTrack(receiver.track)
        });
        (this.mediaDom.remoteVideo as HTMLAudioElement).srcObject = remoteStream;
        (this.mediaDom.remoteVideo as HTMLAudioElement).play()

        // Gets local tracks
        // const localStream = new MediaStream();
        // pc.getSenders().forEach(function(sender) {
        //   localStream.addTrack(sender.track);
        // });
        // localVideo.srcObject = localStream;
        // localVideo.play();
        const constraints = { audio: false, video: true }
        navigator.mediaDevices
          .getUserMedia(constraints)
          .then((stream) => {
            // 获取track句柄，方便结束时关闭
            this.videoTrack = this.videoTrack.concat(stream.getTracks());
            (this.mediaDom.localVideo as HTMLVideoElement).srcObject = stream;
            (this.mediaDom.localVideo as HTMLVideoElement).onloadedmetadata = (e) => {
              (this.mediaDom.localVideo as HTMLVideoElement).play()
            }
          })
          .catch((err) => {
            console.log(`[trackAdd local video] ${err.name}:${err.message}`)
          })
      } else if (this.currentSessionParams.audio) {
        console.log('[sipcall] audio track comming ...')

        // We need to check the peer connection to determine which track was added
        const pc = (session as any).sessionDescriptionHandler.peerConnection

        // Gets remote tracks
        const remoteStream = new MediaStream()
        pc.getReceivers().forEach(function(receiver: RTCRtpReceiver) {
          remoteStream.addTrack(receiver.track)
        });
        // 普通电话在remoteAudio直接播放
        (this.mediaDom.remoteAudio as HTMLAudioElement).srcObject = remoteStream;
        (this.mediaDom.remoteAudio as HTMLAudioElement).play()

        // this.RTCAnalysis({ peerConnection: pc, callbackFn: this.callback.RTCAnalysisCallback })
      }
    })
  }

  /**
   * @description: 分析WebRTC数据
   * @param {type}
   * @return:
   */
  // private RTCAnalysis({ peerConnection, repeatInterval = 10000, callbackFn }) {
  //   getStats(peerConnection, function (result) {
  //     const audioLatency = Number(result.audio.latency);
  //     const audioPacketsLost = Number(result.audio.packetsLost);
  //     const audioBytesReceived = Number(result.audio.bytesReceived);
  //     const audioBytesSent = Number(result.audio.bytesSent);

  //     // const speed = result.bandwidth.speed; // bandwidth download speed (bytes per second)
  //     let googSent = null
  //     let googReceived = null

  //     // result.results.forEach(function (item) {
  //     //   if (item.type === 'ssrc'/* && item.transportId === 'Channel-audio-1'*/) {
  //     //     if (item.hasOwnProperty('packetsSent')) {
  //     //       googSent = item
  //     //     } else if (item.hasOwnProperty('packetsReceived')) {
  //     //       googReceived = item
  //     //     }
  //     //   }
  //     // });

  //     // 时间戳
  //     const timestamp = parseTime(Date.now())
  //     callbackFn.call(this, {
  //       timestamp,
  //       audioLatency,
  //       audioPacketsLost,
  //       audioBytesReceived,
  //       audioBytesSent
  //     })
  //   }, repeatInterval);
  // }

  private stopTracks() {
    if (this.videoTrack.length) {
      this.videoTrack.map(track => {
        track.stop()
      })
      this.videoTrack.splice(0)
    }
  }

  parseError(response: any) {
    const reason = response.reasonPhrase
    const code = response.statusCode

    let message = ''
    const messageType = 'warning'

    if (reason === SIP.C.causes.BUSY) {
      message = '对方正忙，请稍后再拨'
    } else if (reason === SIP.C.causes.REJECTED) {
      message = '您的呼叫被拒绝'
    } else if (reason === SIP.C.causes.REDIRECTED) {
      message = '对方号码可能被迁移'
    } else if (reason === SIP.C.causes.UNAVAILABLE) {
      message = '用户无法访问'
    } else if (reason === SIP.C.causes.NOT_FOUND) {
      message = '找不到该用户'
    } else if (reason === SIP.C.causes.ADDRESS_INCOMPLETE) {
      message = '地址不全'
    } else if (reason === SIP.C.causes.INCOMPATIBLE_SDP) {
      message = '不可用'
    } else if (reason === SIP.C.causes.AUTHENTICATION_ERROR) {
      message = '无授权'
    // } else if (cause === SIP.C.causes.INVALID_TARGET) {
    //   message = 'SIP URI 错误';
    } else if (reason === SIP.C.causes.CONNECTION_ERROR) {
      message = 'SIP Websocket 连接错误'
    } else if (reason === SIP.C.causes.REQUEST_TIMEOUT) {
      message = 'SIP 请求超时'
    } else if (code === 487) {
      // Request Terminated
      // message = '呼叫取消';
    } else if (code === 480) {
      // Temporarily Unavailable
      message = '对方暂时无法接听'
    } else {
      message = reason
    }
    return { message, messageType, reason, code }
  }

  /**
   * 设置用户配置
   * params: {
   *    video: true,
   *    audio: true, 音频应该始终为true
   *    type: 'common' 普通电话 'meeting' 会议
   * }
  */
  private setParamsBySessionMediaType(session: IncomingSession | OutgoingSession) {
    // 需要wsc指定媒体类型
    if (session.body) {
      const sessionBody = session.body
      if (sessionBody.indexOf('video') > 0) {
        this.setCurrentSessionParams({ video: true })
        console.log('set options media to video')
      } else if (sessionBody.indexOf('audio') > 0) {
        this.setCurrentSessionParams({ audio: true })
        console.log('set options media to audio')
      }
    }
  }

  private setCurrentSessionParams({ audio = true, video = false }) {
    // 设置音频
    this.currentSessionParams.audio = audio
    // 设置视频
    this.currentSessionParams.video = video
    return this.currentSession
  }

  /**
   * 全部回调
   * TODO: 做成订阅/发布
  */
  registCallbacks() {
    this.callback.login = function() {
      console.log('[sipcall] login callback')
    }
    this.callback.registered = function() {
      console.log('[sipcall] registered callback')
    }
    this.callback.unregistered = function() {
      console.log('[sipcall] unregistered callback')
    }
    // 其他用户拨打进来的回调函数
    this.callback.callIn = function() {
      console.log('[sipcall] callIn callback')
    }
    // 拨出时回呼的回调
    this.callback.callBack = function() {
      console.log('[sipcall] callBack callback')
    }
    this.callback.callOut = function() {
      console.log('[sipcall] callOut callback')
    }
    this.callback.hungup = () => {
      console.log('[sipcall] hungup callback')
    }
    this.callback.hungupMeeting = function() {

    }
    this.callback.callEnd = () => {
      // 通话结束的收尾工作
      this.currentSession = null
      this.callback.RTCAnalysisCallback(null)
    }
    this.callback.error = (error: IErrorMsg) => {
      console.log(`[sipcall] error ${error.code}`)
    }
    this.callback.message = () => {

    }
    this.callback.stopTracks = () => {
      this.stopTracks()
    }
    this.callback.accepted = function() {
      console.log(`[sipcall] accepted`)
      console.log('[sipcall] accepted callback')
    }
    this.callback.acceptedMeeting = function() {

    }
    this.callback.hold = function() {
      console.log('[sipcall] hold callback')
    }
    this.callback.unhold = function() {
      console.log('[sipcall] unhold callback')
    }
    this.callback.logout = function() {
      console.log('[sipcall] logout callback')
    }
    this.callback.initCallStatus = function() {
      console.log('[sipcall] initCallStatus callback')
    }
    this.callback.registrationFailed = function() {
      console.log('[sipcall] registrationFailed callback')
    }
    this.callback.MediaStreamCallback = function() {

    }
    // RTC分析数据回调
    this.callback.RTCAnalysisCallback = function(params: any) {
      console.log(params)
    }
  }

  private get SessionParams() {
    const { audio, video } = this.currentSessionParams
    const params = {
      media: {
        constraints: {
          audio,
          video
        },
        // stream: this.silentStream,
        render: {}
      },
      sessionDescriptionHandlerOptions: {
        constraints: {
          audio,
          video
        }
      }
    }
    return params
  }

  // get sip config , depends on wsServers and sip account
  private get sipConfig() {
    const uri = `${this.sipAccount.no}@${this.sipServers[0].server}`
    const wsServers = this.sipServers.map(item => `${item.protocol}://${item.server}:${item.port}`)
    const authorizationUser = this.sipAccount.no
    const password = this.sipAccount.pwd

    const config = {
      uri,
      transportOptions: {
        wsServers,
        maxReconnectionAttempts: 99999999, // 两年
        reconnectionTimeout: 5
      },
      sessionDescriptionHandlerFactoryOptions: {
        peerConnectionOptions: {
          rtcConfiguration: {
            iceServers: [
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun.fwdnet.net' },
              { urls: 'stun:stun.ekiga.net' },
              { urls: 'stun:stun.ideasip.com' }
            ]
          }
        }
      },
      authorizationUser,
      password,
      allowLegacyNotifications: true,
      autostart: true,
      register: true,
      registerExpires: 60,
      traceSip: true,
      log: {
        builtinEnabled: true,
        connector: (level: string, category: string, label: string | undefined, content: any) => `${level} ${category} ${label} ${content}`,
        level: 'debug' // "debug", "log", "warn", "error"
      },
      rel100: SIP.C.supported.SUPPORTED
    }
    return config
  }

  // login to server
  login() {

  }
}

export { sipphone }