import React, { useState } from 'react'
import { Button } from '@mui/material'
import { Experimental_CssVarsProvider as CssVarsProvider, styled } from '@mui/material/styles'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogTitle from '@mui/material/DialogTitle'
import cancleButton from '../../assets/image/x.png'
import Swal from 'sweetalert2'
import axios from 'axios'

const ComfirmButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.vars.palette.common.white,
  color: '#574B9F',
  borderColor: '#574B9F',
  border: '1px solid',
  height: 30,
  '&:hover': {
    backgroundColor: '#574B9F',
    color: theme.vars.palette.common.white,
    borderColor: theme.vars.palette.common.white,
  },
}))

const TeamSelectBtn = styled(Button)(({ theme, state, valid }) => ({
  visibility: `${state === '미선택' ? 'visible' : 'hidden'}`,
  backgroundColor: 'theme.vars.palette.common.white',
  color: '#574B9F',
  borderColor: '#574B9F',
  border: '1px solid',
  height: 31,
  '&:hover': {
    backgroundColor: '#574B9F',
    color: theme.vars.palette.common.white,
    borderColor: theme.vars.palette.common.white,
  },
}))

function ProjectTeamSelectConfirmModal(props) {
  const [open, setOpen] = useState(0)

  const handleOpen = (e) => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }
  const handleTeamSelect = async (e) => {
    if (props.valid) {
      handleClose()
      return Swal.fire({
        title: '모집인원이 가득 찼습니다',
        text: '팀원이 부족하다면 공고를 수정해주세요',
        icon: 'error',
        confirmButtonText: '돌아가기',
      })
    } else {
      const applySeq = props.apply.applySeq
      const adminSeq = 5

      try {
        await axios
          .put(process.env.REACT_APP_API_URL + '/posting/member/' + applySeq)
          .then((res) => {})
          .catch((err) => {
            console.log(err)
          })

        console.log('팀원선택 put')

        const letterReq = {
          content: '팀원으로 선정되셨습니다!! 마이페이지를 확인해주세요~^^',
          nickname: props.apply.nickname,
          title: '팀원 확정 메일',
          userSeq: adminSeq,
        }

        await axios
          .post(process.env.REACT_APP_API_URL + '/letter/', letterReq)
          .then((res) => {})
          .catch((err) => {
            console.log(err)
          })

        const copy = [...props.applySeqList]
        copy.push(applySeq)
        props.setapplySeqList(copy)
      } catch (error) {
        console.log(error)
      }
      handleClose()
    }
  }

  return (
    <CssVarsProvider>
      <TeamSelectBtn state={props.apply.applyCode.name} valid={props.valid} onClick={handleOpen}>
        팀원 선택
      </TeamSelectBtn>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        className="cancle-section"
      >
        <div>
          <DialogTitle id="alert-dialog-title" className="cancle-title">
            선택 하시겠습니까?
          </DialogTitle>
          <img src={cancleButton} alt="cancleButton" className="cancle-button" onClick={handleClose} />
          <DialogActions className="delete-button">
            <ComfirmButton onClick={handleTeamSelect}>예</ComfirmButton>
          </DialogActions>
        </div>
      </Dialog>
    </CssVarsProvider>
  )
}
export default ProjectTeamSelectConfirmModal